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

import asyncio
import logging
import os
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from vision_agents.core import Agent, Runner, User
from vision_agents.core.agents import AgentLauncher
from vision_agents.core.instructions import Instructions
from vision_agents.core.llm.events import RealtimeDisconnectedEvent
from vision_agents.plugins import gemini, getstream

load_dotenv()

logger = logging.getLogger("ajami_teacher")

LESSON_API_BASE_URL = os.getenv("LESSON_API_BASE_URL", "http://localhost:8081").rstrip("/")
HAUSA_LANGUAGE_ID = "hausa-ajami"

# Custom call event type the mobile app listens for (see call.on("custom", ...)
# in src/app/(home)/audio-lesson.native.tsx) to render the on-screen display
# card. Keep this string in sync with that listener.
AJAMI_DISPLAY_EVENT_TYPE = "ajami_display"

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
  wayarsa da murya mai karfi (wato abin da ke cikin darasin da aka baka a
  kasa), sannan ka gyara furucinsa a hankali idan akwai kuskure, kana
  kwatanta sauti da misalai masu sauki.
- Ka yi amfani da jimloli gajeru, bayyanannu, masu sauki ga mai fara koyo.
- Ka karfafa gwiwar dalibi koyaushe, kuma ka kasance mai hakuri idan ya yi
  kuskure fiye da sau daya.

MUHIMMI — game da allon wayar dalibi:
- Kai kanka ba ka da ikon canza allon kai tsaye — sai dai ta hanyar dabarar
  (tool) mai suna "display_on_screen" da ke akwai a gare ka. Idan ka kira ta
  tare da kalma/jimla a Ajami, rubutun Latin nata, da karamin bayani (idan
  akwai bukata), app din zai nuna su a allon dalibi nan take.
- Kana iya ambaton abubuwan da SUKE NAN KO YANZU a allon darasi (misali
  haruffa/kalmomin da aka jera maka a sama a wannan jagora) ba tare da bukatar
  kira dabarar ba, domin app din ne ya riga ya nuna su tun farko.
- Kada KO YAUSHE ka ce "duba allo", "zan nuna maka", "zan rubuta maka", ko
  wata alkawarin makamanciyarta, SAI IDAN ka RIGA ka kira dabarar
  display_on_screen don wannan abu musamman a wannan lokacin. Kada ka yi
  alkawarin cewa wani sabon abu zai bayyana a allo in ba ka aika shi ta
  wannan dabara ba tukuna — faɗin haka ba tare da kira dabarar ba zai ɓata
  amincewar dalibi.
- Idan dalibi ya nemi ya GANI wani harafi/kalma, ko kuma nuna misali zai
  taimaka wa koyo a fili, KA KIRA display_on_screen (idan abin ya dace da
  wannan darasi), sannan nan take ka ci gaba da magana kana ambaton abin da
  YANZU ke allon (misali: "Ka kalli allon yanzu, ga..."). Idan ba za ka iya
  amfani da dabarar ba don wani dalili (misali abin da ake bukata bai dace da
  wannan darasi ba kwata-kwata), ka bayyana siffarsa da baki kamar yadda ka
  saba yi da kyau, sannan ka gaya wa dalibi zai same shi a cikin darussan app
  din nan gaba — kada ka yi kamar za ka nuna shi yanzu ba tare da kira
  dabarar ba.
""".strip()

NO_LESSON_FALLBACK = (
    "Ba a samu takamaiman bayanin darasi ba a wannan zama. Ka gaishe da "
    "dalibi cikin dumi, ka tambaye shi wane bangare na Ajami yake son koya, "
    "sannan ka fara koyarwa daga can."
)

# Gemini Live free-tier sessions are time-limited (see README). Shortly before
# the server force-closes the socket it sends a GoAway frame; we use that as
# a cue to have the teacher say a natural goodbye instead of the lesson just
# dying mid-sentence. GOAWAY_WRAPUP_GRACE_SECONDS must stay comfortably under
# Gemini's shortest observed GoAway warning window so we finish speaking and
# close our own session before Gemini closes it for us.
GOAWAY_WRAPUP_GRACE_SECONDS = 8.0
GOAWAY_WRAPUP_INSTRUCTION = (
    "Lokacin zaman yau ya kusa karewa saboda dalilan fasaha (ba wani kuskuren "
    "dalibi ba ne). Cikin gajerun jimloli 2-3 kacal, ka: (1) taƙaita abin da "
    "aka koya a wannan zaman, (2) ka karfafa wa dalibi gwiwa, (3) ka yi masa "
    "bankwana da kirki. Kada ka fara wani sabon abu — wannan bankwana ce kawai."
)


class _GoAwayWrapUp:
    """Coordinates a graceful lesson wrap-up when Gemini Live's session hits
    its duration limit, instead of the agent crashing with an unhandled
    ConnectionClosedError once Gemini force-closes the socket.

    Two triggers feed into the same one-shot wrap-up:
    - `on_go_away`: Gemini's advance warning (best case — connection is still
      alive, so the teacher can actually say goodbye).
    - `on_disconnected`: safety net for any other unclean disconnect that
      wasn't preceded by a GoAway we saw (network blip, different close
      code, etc.) — there's no live session left to speak through, so this
      just ends the agent instead of leaving it feeding audio into a dead
      connection forever.
    """

    def __init__(self) -> None:
        self.agent: Optional[Agent] = None
        self._triggered = False

    def on_go_away(self, time_left: Optional[str]) -> None:
        if self._triggered or self.agent is None:
            return
        self._triggered = True
        logger.info(
            "Gemini Live sent GoAway (time_left=%s); wrapping up the lesson",
            time_left,
        )
        asyncio.create_task(self._wrap_up_and_close())

    async def on_disconnected(self, *, clean: bool, reason: Optional[str]) -> None:
        if self._triggered:
            return
        self._triggered = True
        if not clean:
            logger.warning(
                "Gemini Live connection closed unexpectedly (reason=%s); "
                "ending the lesson",
                reason,
            )
        if self.agent is not None:
            await self.agent.close()

    async def _wrap_up_and_close(self) -> None:
        agent = self.agent
        assert agent is not None
        try:
            await agent.simple_response(text=GOAWAY_WRAPUP_INSTRUCTION)
            await asyncio.sleep(GOAWAY_WRAPUP_GRACE_SECONDS)
        except Exception:
            logger.exception("Failed to deliver the GoAway wrap-up message")
        finally:
            await agent.close()


class _GoAwayAwareRealtime(gemini.Realtime):
    """`gemini.Realtime` that reports GoAway frames to a callback.

    The installed vision-agents Gemini plugin (see its `_process_events`)
    has no hook for the Live API's GoAway signal — it silently falls through
    to a debug log and lets the socket die with the server's close code. We
    wrap the underlying `AsyncSession.receive()` generator to peek at each
    message for `go_away` and report it, without touching how the base
    class processes every other message type.
    """

    def __init__(self, *args: Any, on_go_away, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._on_go_away = on_go_away

    async def _establish_session(self) -> None:
        await super()._establish_session()
        session = self._real_session
        raw_receive = session.receive

        async def _receive_and_watch_for_go_away():
            async for message in raw_receive():
                if message.go_away is not None:
                    self._on_go_away(message.go_away.time_left)
                yield message

        session.receive = _receive_and_watch_for_go_away


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


def _register_display_tool(agent: Agent) -> None:
    """Gives the teacher a real way to put a word on the learner's screen.

    Registers `display_on_screen` as a Gemini-callable tool (see the
    "MUHIMMI" block in BASE_PERSONA, which only allows the teacher to claim
    something is shown after it has actually called this). The handler sends
    a Stream custom call event; the mobile app renders it (see
    call.on("custom", ...) in src/app/(home)/audio-lesson.native.tsx).
    """

    @agent.llm.register_function(
        name="display_on_screen",
        description=(
            "Show the learner a word or short phrase in Ajami script on "
            "their phone screen, with its Latin transliteration and an "
            "optional short note. Call this when the learner asks to see "
            "something, or when showing an example would clearly help "
            "teaching — then keep talking and refer to what is now on "
            "screen. Only use this for content that fits the current "
            "lesson."
        ),
    )
    async def display_on_screen(latin: str, ajami: str, note: str = "") -> dict:
        await agent.edge.send_custom_event(
            {
                "type": AJAMI_DISPLAY_EVENT_TYPE,
                "latin": latin,
                "ajami": ajami,
                "note": note,
            }
        )
        return {"shown": True}


async def create_agent(**kwargs) -> Agent:
    wrap_up = _GoAwayWrapUp()
    agent = Agent(
        edge=getstream.Edge(),
        agent_user=AGENT_USER,
        instructions=BASE_PERSONA,
        llm=_GoAwayAwareRealtime(
            config={
                "speech_config": {
                    "language_code": "ha",
                },
            },
            on_go_away=wrap_up.on_go_away,
        ),
    )
    wrap_up.agent = agent

    @agent.llm.events.subscribe
    async def _on_realtime_disconnected(event: RealtimeDisconnectedEvent) -> None:
        await wrap_up.on_disconnected(clean=event.clean, reason=event.reason)

    _register_display_tool(agent)

    return agent


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
