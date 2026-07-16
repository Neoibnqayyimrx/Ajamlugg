"""Canary test for the private vision-agents SDK internals used by
_register_student_interrupt_handler (see M6 in prompts/19-self-audit.md).

agent._connection._connection and agent._flow.interrupt() are undocumented
attributes of the installed vision-agents SDK with no public API
equivalent (see the docstring on _register_student_interrupt_handler in
agent.py). This test fakes just enough of that shape to prove the handler
wires the "custom" event to interrupt() — if a vision-agents upgrade
renames or removes either attribute, this test fails loudly instead of the
interrupt path silently going dark at runtime.

Run:
    uv run pytest tests/test_interrupt.py
"""

from unittest.mock import AsyncMock

from agent import (
    STUDENT_INTERRUPT_EVENT_TYPE,
    _GoAwayWrapUp,
    _register_student_interrupt_handler,
)


class _FakeConnection:
    """Fake `agent._connection._connection` — records `.on(event, handler)` calls."""

    def __init__(self):
        self.handlers = {}

    def on(self, event: str, handler) -> None:
        self.handlers[event] = handler


class _FakeInnerConnection:
    def __init__(self, connection: _FakeConnection):
        self._connection = connection


class _FakeAgent:
    def __init__(self):
        self._connection = _FakeInnerConnection(_FakeConnection())
        self._flow = AsyncMock()


async def test_student_interrupt_event_calls_flow_interrupt():
    agent = _FakeAgent()
    _register_student_interrupt_handler(agent, _GoAwayWrapUp())

    on_custom_event = agent._connection._connection.handlers["custom"]
    await on_custom_event({"custom": {"type": STUDENT_INTERRUPT_EVENT_TYPE}})

    agent._flow.interrupt.assert_awaited_once()


async def test_unrelated_custom_event_does_not_call_flow_interrupt():
    agent = _FakeAgent()
    _register_student_interrupt_handler(agent, _GoAwayWrapUp())

    on_custom_event = agent._connection._connection.handlers["custom"]
    await on_custom_event({"custom": {"type": "ajami_display"}})
    await on_custom_event({})  # missing "custom" key entirely

    agent._flow.interrupt.assert_not_awaited()


async def test_student_interrupt_is_ignored_during_goaway_wrap_up():
    """M1: the scripted GoAway goodbye shouldn't be cut off by a tap — see
    _GoAwayWrapUp.is_wrapping_up and prompts/19-self-audit.md M1."""
    agent = _FakeAgent()
    wrap_up = _GoAwayWrapUp()
    wrap_up.is_wrapping_up = True
    _register_student_interrupt_handler(agent, wrap_up)

    on_custom_event = agent._connection._connection.handlers["custom"]
    await on_custom_event({"custom": {"type": STUDENT_INTERRUPT_EVENT_TYPE}})

    agent._flow.interrupt.assert_not_awaited()
