"""Unit tests for live-caption transcript forwarding (see prompts/17-live-captions.md).

These simulate the fake flow of transcript events the installed Gemini
realtime plugin emits (_process_events in
vision_agents.plugins.gemini.gemini_realtime) by calling the same
`_emit_*_speech_*` hook points it calls into, without needing a real
network connection or API key.

Run:
    uv run pytest tests/test_captions.py
"""

import asyncio

from agent import CAPTION_FLUSH_INTERVAL_SECONDS, _CaptionStream, _GoAwayAwareRealtime


class _FakeSender:
    """Fake `agent.edge.send_custom_event` — records every payload sent."""

    def __init__(self):
        self.events = []

    async def __call__(self, payload):
        self.events.append(payload)


def _make_llm(caption_streams=None):
    llm = _GoAwayAwareRealtime(config={}, on_go_away=lambda time_left: None, api_key="fake-test-key")
    llm._caption_streams = caption_streams
    return llm


# ─── _CaptionStream in isolation ────────────────────────────────────────────


async def test_deltas_batch_into_a_single_non_final_flush():
    sender = _FakeSender()
    stream = _CaptionStream(sender, "teacher")

    stream.add_delta("Sannu ")
    stream.add_delta("da ")
    stream.add_delta("zuwa")

    assert sender.events == []  # still within the batch window

    await asyncio.sleep(CAPTION_FLUSH_INTERVAL_SECONDS + 0.1)

    assert sender.events == [
        {"type": "caption", "speaker": "teacher", "text": "Sannu da zuwa", "final": False}
    ]


async def test_end_utterance_flushes_immediately_as_final_and_resets():
    sender = _FakeSender()
    stream = _CaptionStream(sender, "learner")

    stream.add_delta("Ina ")
    stream.add_delta("kwana")
    await stream.end_utterance()

    assert sender.events[-1] == {
        "type": "caption",
        "speaker": "learner",
        "text": "Ina kwana",
        "final": True,
    }

    # Buffer is empty after finalizing — a stray scheduled flush must not resend it.
    await asyncio.sleep(CAPTION_FLUSH_INTERVAL_SECONDS + 0.1)
    assert len(sender.events) == 1


async def test_start_utterance_discards_unfinalized_leftover_text():
    """Guards the explicit-interrupt path: student_interrupt clears LLM/audio
    buffers directly (agent._flow.interrupt() -> llm.interrupt()) without
    going through _emit_agent_speech_ended, so a stale partial caption must
    not glue onto the next utterance's deltas."""
    sender = _FakeSender()
    stream = _CaptionStream(sender, "teacher")

    stream.add_delta("Za mu")  # never finalized
    stream.start_utterance()
    stream.add_delta("Yanzu ")
    stream.add_delta("sai")
    await stream.end_utterance()

    assert sender.events == [
        {"type": "caption", "speaker": "teacher", "text": "Yanzu sai", "final": True}
    ]


async def test_empty_delta_is_ignored():
    sender = _FakeSender()
    stream = _CaptionStream(sender, "teacher")

    stream.add_delta("")
    await stream.end_utterance()

    assert sender.events == []


# ─── End-to-end through _GoAwayAwareRealtime's overridden hooks ────────────


async def test_realtime_forwards_agent_transcript_deltas_and_finalizes_on_speech_ended():
    teacher_sender = _FakeSender()
    learner_sender = _FakeSender()
    llm = _make_llm(
        {
            "teacher": _CaptionStream(teacher_sender, "teacher"),
            "learner": _CaptionStream(learner_sender, "learner"),
        }
    )

    llm._emit_agent_speech_started()
    llm._emit_agent_speech_transcription("Sannu ", mode="delta")
    llm._emit_agent_speech_transcription("da zuwa", mode="delta")
    await asyncio.sleep(CAPTION_FLUSH_INTERVAL_SECONDS + 0.1)

    assert teacher_sender.events[-1] == {
        "type": "caption",
        "speaker": "teacher",
        "text": "Sannu da zuwa",
        "final": False,
    }

    llm._emit_agent_speech_ended()
    await asyncio.sleep(0.05)

    assert teacher_sender.events[-1]["final"] is True
    assert learner_sender.events == []


async def test_realtime_resets_on_a_new_turn_started_without_a_matching_ended():
    """A second _emit_agent_speech_started before the first was ever ended
    (explicit student_interrupt path) must not merge the two utterances."""
    teacher_sender = _FakeSender()
    llm = _make_llm({"teacher": _CaptionStream(teacher_sender, "teacher"), "learner": _CaptionStream(_FakeSender(), "learner")})

    llm._emit_agent_speech_started()
    llm._emit_agent_speech_transcription("Partial", mode="delta")
    await asyncio.sleep(0.05)

    llm._emit_agent_speech_started()  # interrupt-style restart, no _ended in between
    llm._emit_agent_speech_transcription("Fresh", mode="delta")
    llm._emit_agent_speech_ended()
    await asyncio.sleep(0.05)

    assert teacher_sender.events[-1] == {
        "type": "caption",
        "speaker": "teacher",
        "text": "Fresh",
        "final": True,
    }


async def test_realtime_does_nothing_when_caption_streams_not_wired_up():
    """Before _register_caption_forwarding runs, _caption_streams is None —
    the overrides must be no-ops rather than raising."""
    llm = _make_llm(caption_streams=None)

    llm._emit_agent_speech_started()
    llm._emit_agent_speech_transcription("hello", mode="delta")
    llm._emit_agent_speech_ended()
    llm._emit_user_speech_started()
    llm._emit_user_speech_transcription("hi", mode="delta")
    llm._emit_user_speech_ended()
    # No assertion needed — the test passes if none of the above raised.
