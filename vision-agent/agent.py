"""Ajami's AI language teacher for the Audio Lesson feature.

Joins the same Stream call the mobile app already reserved (see
src/app/api/stream/session+api.ts and src/hooks/useAudioLessonCall.ts) as a
second participant, teaching voice-only through Gemini Live. The teacher
always speaks Hausa and teaches Ajami (Arabic-script Hausa) through Hausa —
learners are Hausa speakers learning to read and write the script.

Lesson content (title, goals, aiTeacherPrompt, vocabulary) is fetched from
the app's own /api/lessons/:lessonId route, keyed by the lessonId in the
call's custom data — never hardcoded here.
"""

import logging
import os
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from vision_agents.core import Agent, Runner, User
from vision_agents.core.agents import AgentLauncher
from vision_agents.core.instructions import Instructions
from vision_agents.plugins import gemini, getstream

load_dotenv()

logger = logging.getLogger("ajami_teacher")

LESSON_API_BASE_URL = os.getenv("LESSON_API_BASE_URL", "http://localhost:8081").rstrip("/")
HAUSA_LANGUAGE_ID = "hausa-ajami"

AGENT_USER = User(name="Malamin Ajami", id="ajami-teacher")

BASE_PERSONA = """
Kai "Malamin Ajami" ne — malami mai kirki, mai hakuri, kuma mai karfafa gwiwa
wanda ke koyar da rubutun Ajami (Hausa da aka rubuta da haruffan Larabci) ga
dalibai da Hausa ce yarensu.

Ka yi magana da HAUSA KAWAI a ko-yaushe, ko da dalibin ya yi amfani da wani
harshe. Kar ka taba amfani da Turanci ko wani harshe face ana bukatar ambaton
wata kalma ta musamman.

Yadda za ka koyar:
- Ka bi darasin da aka baka a kasa sosai — kar ka kaucewa daga manufofinsa.
- Ka iya tambayar dalibi ya karanta kalma ko harafi da ke bayyana a allon
  wayarsa da murya mai karfi, sannan ka gyara furucinsa a hankali idan akwai
  kuskure, kana kwatanta sauti da misalai masu sauki.
- Ka yi amfani da jimloli gajeru, bayyanannu, masu sauki ga mai fara koyo.
- Ka karfafa gwiwar dalibi koyaushe, kuma ka kasance mai hakuri idan ya yi
  kuskure fiye da sau daya.
""".strip()

NO_LESSON_FALLBACK = (
    "Ba a samu takamaiman bayanin darasi ba a wannan zama. Ka gaishe da "
    "dalibi cikin dumi, ka tambaye shi wane bangare na Ajami yake son koya, "
    "sannan ka fara koyarwa daga can."
)


async def _fetch_lesson(lesson_id: str) -> Optional[dict[str, Any]]:
    """Fetch lesson content from the app's own API route (never hardcoded)."""
    url = f"{LESSON_API_BASE_URL}/api/lessons/{lesson_id}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception:
        logger.exception("Failed to fetch lesson %r from %s", lesson_id, url)
        return None


def _build_instructions(lesson: Optional[dict[str, Any]]) -> str:
    """Combine the base Hausa-teacher persona with this session's lesson content."""
    if lesson is None:
        return f"{BASE_PERSONA}\n\n{NO_LESSON_FALLBACK}"

    sections = [
        BASE_PERSONA,
        f"\n## Darasin yau: {lesson.get('title', '')}",
        lesson.get("description", ""),
    ]

    goals = lesson.get("goals") or []
    if goals:
        sections.append("\nManufofin wannan darasi:")
        sections.extend(f"- {goal}" for goal in goals)

    teacher_prompt = lesson.get("aiTeacherPrompt")
    if teacher_prompt:
        sections.append("\nJagorar musamman ga wannan darasi (daga tsarin karatu):")
        sections.append(teacher_prompt)

    vocab_lines = [
        f"- {vocab['ajami']} ({vocab['transliteration']}) = {vocab['translation']}"
        for activity in (lesson.get("activities") or [])
        if (vocab := activity.get("vocabulary"))
    ]
    if vocab_lines:
        sections.append(
            "\nHaruffa/kalmomin da ke bayyana a allon dalibi a wannan darasi "
            "(za ka iya tambayar dalibi ya karanta su da murya):"
        )
        sections.extend(vocab_lines)

    return "\n".join(sections)


async def create_agent(**kwargs) -> Agent:
    return Agent(
        edge=getstream.Edge(),
        agent_user=AGENT_USER,
        instructions=BASE_PERSONA,
        llm=gemini.Realtime(
            config={
                "speech_config": {
                    "language_code": "ha",
                },
            }
        ),
    )


async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    # get_or_create against the call the mobile app already reserved — this
    # does not overwrite its members/custom data, only fetches call state.
    call = await agent.create_call(call_type, call_id)

    lesson_id = call.custom_data.get("lessonId")
    language_id = call.custom_data.get("languageId")
    if language_id and language_id != HAUSA_LANGUAGE_ID:
        logger.warning(
            "Call %s is for languageId=%r, but this teacher only supports %r",
            call_id,
            language_id,
            HAUSA_LANGUAGE_ID,
        )

    lesson = await _fetch_lesson(lesson_id) if lesson_id else None
    if lesson_id and lesson is None:
        logger.warning("Proceeding without lesson content for lessonId=%r", lesson_id)

    agent.instructions = Instructions(input_text=_build_instructions(lesson))
    agent.llm.set_instructions(agent.instructions)

    async with agent.join(call):
        lesson_title = lesson.get("title") if lesson else None
        greeting_instruction = (
            f"Gai da dalibi cikin dumi da Hausa, sannan ka fara darasi akan: {lesson_title}."
            if lesson_title
            else "Gai da dalibi cikin dumi da Hausa, sannan ka tambaye shi abin da yake son koya a yau."
        )
        await agent.simple_response(text=greeting_instruction)
        await agent.finish()


runner = Runner(AgentLauncher(create_agent=create_agent, join_call=join_call))


if __name__ == "__main__":
    runner.cli()
