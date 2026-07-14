"""Example tests for vision-agent using `vision_agents.testing`.

Run:
    uv run pytest
"""

import os

import pytest
from dotenv import load_dotenv

from agent import BASE_PERSONA, _build_instructions

from vision_agents.plugins import gemini
from vision_agents.testing import LLMJudge, TestSession

load_dotenv()


pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        not (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
        reason="GEMINI_API_KEY not set",
    ),
]


async def test_greeting_is_in_hausa():
    """Use `LLMJudge` to verify the persona greets in Hausa, not English."""
    judge = LLMJudge(gemini.LLM())

    async with TestSession(llm=gemini.LLM(), instructions=BASE_PERSONA) as session:
        response = await session.simple_response("Hi there!")

        assert response.output is not None
        assert response.duration_ms > 0
        assert len(response.chat_messages) >= 1

        verdict = await judge.evaluate(
            response.chat_messages[-1],
            intent="A warm, short greeting written entirely in Hausa (not English)",
        )
        assert verdict.success, verdict.reason


async def test_lesson_instructions_reference_content():
    """_build_instructions should weave lesson title/goals/vocab into the persona."""
    lesson = {
        "title": "The First Three Letters",
        "description": "Learn to recognize Alif, Ba, and Ta.",
        "goals": ["Recognize the letter Alif (ا)"],
        "aiTeacherPrompt": "Focus on the sounds 'A', 'Ba', and 'Ta'.",
        "activities": [
            {"vocabulary": {"ajami": "ا", "transliteration": "Alif", "translation": "'A' sound"}}
        ],
    }
    instructions = _build_instructions(lesson)

    assert "The First Three Letters" in instructions
    assert "Alif" in instructions
    assert "Focus on the sounds" in instructions


async def test_remembers_context_across_turns():
    """Within one `TestSession`, conversation history accumulates."""
    judge = LLMJudge(gemini.LLM())

    async with TestSession(llm=gemini.LLM(), instructions=BASE_PERSONA) as session:
        await session.simple_response("Sunana Alex.")
        response = await session.simple_response("Mece sunana?")

        verdict = await judge.evaluate(
            response.chat_messages[-1],
            intent="The assistant correctly recalls that the user's name is Alex",
        )
        assert verdict.success, verdict.reason
