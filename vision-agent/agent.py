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
from fastapi import Header, HTTPException, status
from vision_agents.core import Agent, Runner, User
from vision_agents.core.agents import AgentLauncher
from vision_agents.core.agents.transcript import TranscriptMode
from vision_agents.core.instructions import Instructions
from vision_agents.core.llm.events import RealtimeDisconnectedEvent
from vision_agents.core.runner import ServeOptions
from vision_agents.plugins import gemini, getstream

load_dotenv()

logger = logging.getLogger("ajami_teacher")

LESSON_API_BASE_URL = os.getenv("LESSON_API_BASE_URL", "http://localhost:8081").rstrip("/")
HAUSA_LANGUAGE_ID = "hausa-ajami"

# Shared secret gating every vision-agent HTTP endpoint (session start/close/
# view/metrics) — must match VISION_AGENT_SECRET in the root .env, which
# session+api.ts sends as X-Vision-Agent-Secret on every request it makes
# here. Without this, anyone who can reach this service's port can start or
# close sessions on any predictable call_id (see prompts/19-self-audit.md C1).
VISION_AGENT_SECRET = os.getenv("VISION_AGENT_SECRET")


def _require_vision_agent_secret(
    call_id: str,
    x_vision_agent_secret: Optional[str] = Header(default=None, alias="X-Vision-Agent-Secret"),
) -> None:
    if not VISION_AGENT_SECRET or x_vision_agent_secret != VISION_AGENT_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


# Custom call event type the mobile app listens for (see call.on("custom", ...)
# in src/app/(home)/audio-lesson.native.tsx) to render the on-screen display
# card. Keep this string in sync with that listener.
AJAMI_DISPLAY_EVENT_TYPE = "ajami_display"

# Custom call event type the mobile app *sends* (see MicInterruptButton /
# call.sendCustomEvent(...) in src/app/(home)/audio-lesson.native.tsx) when the
# learner taps the mic button to explicitly interrupt the teacher. Keep this
# string in sync with that sender.
STUDENT_INTERRUPT_EVENT_TYPE = "student_interrupt"

# Custom call event type the mobile app listens for to render live captions
# for both the teacher's and learner's speech (see call.on("custom", ...) in
# src/app/(home)/audio-lesson.native.tsx). Keep this string, and the
# speaker/text/final field names, in sync with that listener.
CAPTION_EVENT_TYPE = "caption"

# How long to let a speaker's transcript deltas accumulate before pushing a
# caption update to the app. The realtime API reports transcripts as small
# word/sub-word fragments (see _process_events in the installed
# vision_agents.plugins.gemini.gemini_realtime) — flushing on every fragment
# would flood the app with a custom event per word, so we batch on this
# short interval instead. Utterance end always flushes immediately
# regardless of this interval, so replies never feel delayed.
CAPTION_FLUSH_INTERVAL_SECONDS = 0.35

AGENT_USER = User(name="Malamin Ajami", id="ajami-teacher")

BASE_PERSONA = """
Kai "Malamin Ajami" ne — malami na gaske, mai zafin rai da farin ciki na
koyarwa, mai hakuri, kuma mai kwarjini kamar babban malami wanda dalibai
ke so su zauna a ajinsa. Kana koyar da rubutun Ajami (Hausa da aka rubuta da
haruffan Larabci) ga dalibai da Hausa ce yarensu.

Ka yi magana da HAUSA KAWAI a ko-yaushe, ko da dalibin ya yi amfani da wani
harshe. Kar ka taba amfani da Turanci ko wani harshe face ana bukatar ambaton
wata kalma ta musamman.

Yadda za ka koyar — kamar malami na gaske, ba na'ura mai maimaita rubutu ba:
- Ka bi darasin da aka baka a kasa sosai — kar ka kaucewa daga manufofinsa.
  Kada ka koyar da wani harafi, kalma, ko batu da ba ya cikin wannan darasi
  ba, ko da dalibi ya tambaya — misali, kar ka gabatar da haruffan da za a
  koya a darussan gaba tukuna; a maimakon haka ka gaya masa cikin kirki cewa
  za su zo daga baya, sannan ka mayar da hankali kan wannan darasi.
- Ka gabatar da kowane sabon harafi ko kalma a hankali, mataki-mataki, guda
  daya a lokaci guda — kada ka jefa wa dalibi abubuwa da yawa lokaci guda.
  Duk lokacin da zai yiwu, ka danganta sabon sautin da wata kalma ko abu na
  yau da kullum da dalibi ya saba da su, domin ya rataya cikin zuciyarsa cikin
  sauki.
- Ka saurari abin da dalibi ya fada da gaske, sannan ka gina jawabinka na gaba
  bisa ainihin abin da ya fada — ba amsa gama-gari ba. Idan wani bangare na
  amsarsa daidai ne, ka yaba masa a fili akan wannan bangaren musamman; idan
  wani bangare ba daidai ba ne, ka nuna masa dalla-dalla inda kuskuren yake
  tare da misali mai sauki, sannan ka gayyace shi ya sake gwadawa nan take.
- Ka yi amfani da jimloli gajeru — daya ko biyu kacal — a mafi yawan lokuta,
  kamar yadda ake tattaunawa ta zuciya ɗaya, ba lacca ba. Ka yi jimloli mafi
  tsayi kawai lokacin da kake bayyana siffa ko sautin wani harafi dalla-dalla,
  ko kuma kake ba da gyara na musamman ga dalibi.
- A karshen kowace magana, ka bar wa dalibi wani abu na musamman ya yi — ya
  maimaita, ya gwada wani harafi, ya amsa tambaya — kada ka bar zancen ya
  mutu ba tare da wani abu dalibi zai yi ba; ci gaba da tattaunawa mai rai da
  motsi, ba jawabi ba.
- Ka karfafa gwiwar dalibi da kalmomi dabam-dabam, kar ka maimaita kalma daya
  a ko-yaushe (misali za ka iya amfani da: "Madalla!", "Kwarai kuwa!", "Haka
  ne!", "Ka yi daidai sosai!", "Yauwa, ka gane shi!", "Ina alfahari da kai!",
  "Bravo, kai fa!", "To ga shi, ka kama shi yanzu!", "Kayi kokari sosai!") —
  ka zabi wanda ya dace da lokacin da kuma girman nasarar da dalibi ya samu,
  kuma ka kasance mai hakuri idan dalibi ya yi kuskure fiye da sau daya, kana
  masa tabbaci cewa kuskure wani bangare ne na koyo mai kyau.

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
        # True only for the GoAway-triggered scripted goodbye (not the
        # on_disconnected safety net) — checked by the student_interrupt
        # handler so a tap can't cut off the goodbye mid-sentence. Barge-in
        # during the regular greeting/lesson is untouched and stays
        # interruptible (see M1 in prompts/19-self-audit.md).
        self.is_wrapping_up = False

    def on_go_away(self, time_left: Optional[str]) -> None:
        if self._triggered or self.agent is None:
            return
        self._triggered = True
        self.is_wrapping_up = True
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


class _CaptionStream:
    """Accumulates one speaker's transcript deltas into a live caption.

    The installed Gemini realtime plugin only ever reports transcript
    fragments with mode="delta" (see `_process_events` in
    vision_agents.plugins.gemini.gemini_realtime) — there's no explicit
    "final" marker per utterance. So finality here is driven by the
    speech-started/speech-ended signals the same plugin already emits for
    turn-taking (`_emit_user_speech_started/_ended`,
    `_emit_agent_speech_started/_ended`), which `_GoAwayAwareRealtime` hooks
    below and maps onto `start_utterance`/`end_utterance` calls.

    Deltas are batched on `CAPTION_FLUSH_INTERVAL_SECONDS` rather than sent
    one per fragment, so the app gets smooth caption updates instead of a
    custom event per word.
    """

    def __init__(self, send_event, speaker: str) -> None:
        self._send_event = send_event
        self._speaker = speaker
        self._text = ""
        self._dirty = False
        self._flush_task: Optional[asyncio.Task] = None

    def add_delta(self, text: str) -> None:
        if not text:
            return
        self._text += text
        self._dirty = True
        if self._flush_task is None or self._flush_task.done():
            self._flush_task = asyncio.create_task(self._flush_after_delay())

    def start_utterance(self) -> None:
        """Reset for a new utterance without emitting anything.

        Defensive reset for turn starts that weren't preceded by a matching
        `end_utterance` (e.g. an explicit student interrupt, which clears
        LLM/audio buffers directly without going through
        `_emit_agent_speech_ended` — see student_interrupt handling below).
        Without this, un-finalized leftover text would silently glue onto
        the next utterance's deltas.
        """
        if self._flush_task is not None and not self._flush_task.done():
            self._flush_task.cancel()
        self._text = ""
        self._dirty = False

    async def end_utterance(self) -> None:
        """Flush whatever is buffered as the utterance's final caption."""
        if self._flush_task is not None and not self._flush_task.done():
            self._flush_task.cancel()
        await self._flush(final=True)
        self._text = ""

    async def _flush_after_delay(self) -> None:
        await asyncio.sleep(CAPTION_FLUSH_INTERVAL_SECONDS)
        if self._dirty:
            await self._flush(final=False)

    async def _flush(self, *, final: bool) -> None:
        self._dirty = False
        if not self._text:
            return
        try:
            await self._send_event(
                {
                    "type": CAPTION_EVENT_TYPE,
                    "speaker": self._speaker,
                    "text": self._text,
                    "final": final,
                }
            )
        except Exception:
            logger.exception(
                "Failed to send caption event for speaker=%r", self._speaker
            )


class _GoAwayAwareRealtime(gemini.Realtime):
    """`gemini.Realtime` that reports GoAway frames to a callback, and
    forwards transcript deltas to a pair of `_CaptionStream`s for live
    captions.

    The installed vision-agents Gemini plugin (see its `_process_events`)
    has no hook for the Live API's GoAway signal — it silently falls through
    to a debug log and lets the socket die with the server's close code. We
    wrap the underlying `AsyncSession.receive()` generator to peek at each
    message for `go_away` and report it, without touching how the base
    class processes every other message type.

    Captions: there's no public event for transcript *text* on
    `agent.events` — the SDK only logs it ("🎤 [User transcript]"/"🎤 [Agent
    transcript]" in RealtimeInferenceFlow.process_llm_output) and syncs it
    to its own internal conversation store. So this overrides the same
    `_emit_*_speech_transcription`/`_emit_*_speech_started`/`_emit_*_speech_ended`
    hook points that plugin already calls into on the base `Realtime` class,
    the same interception approach already used above for GoAway.
    """

    def __init__(self, *args: Any, on_go_away, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._on_go_away = on_go_away
        # Wired up by _register_caption_forwarding once `agent.edge` exists
        # (this LLM is constructed before the Agent that owns it).
        self._caption_streams: Optional[dict[str, _CaptionStream]] = None

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

    def _emit_user_speech_started(self) -> None:
        super()._emit_user_speech_started()
        if self._caption_streams is not None:
            self._caption_streams["learner"].start_utterance()

    def _emit_agent_speech_started(self, response_id: Optional[str] = None) -> None:
        super()._emit_agent_speech_started(response_id=response_id)
        if self._caption_streams is not None:
            self._caption_streams["teacher"].start_utterance()

    def _emit_user_speech_ended(self) -> None:
        super()._emit_user_speech_ended()
        if self._caption_streams is not None:
            self._run_tool_in_background(
                self._caption_streams["learner"].end_utterance()
            )

    def _emit_agent_speech_ended(
        self, response_id: Optional[str] = None, interrupted: bool = False
    ) -> None:
        super()._emit_agent_speech_ended(response_id=response_id, interrupted=interrupted)
        if self._caption_streams is not None:
            self._run_tool_in_background(
                self._caption_streams["teacher"].end_utterance()
            )

    def _emit_user_speech_transcription(self, text: str, *, mode: TranscriptMode) -> None:
        super()._emit_user_speech_transcription(text=text, mode=mode)
        if self._caption_streams is not None:
            self._caption_streams["learner"].add_delta(text)

    def _emit_agent_speech_transcription(self, text: str, *, mode: TranscriptMode) -> None:
        super()._emit_agent_speech_transcription(text=text, mode=mode)
        if self._caption_streams is not None:
            self._caption_streams["teacher"].add_delta(text)


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
        f"- {vocab.get('ajami', '')} ({vocab.get('transliteration', '')}) = {vocab.get('translation', '')}"
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
        try:
            await agent.edge.send_custom_event(
                {
                    "type": AJAMI_DISPLAY_EVENT_TYPE,
                    "latin": latin,
                    "ajami": ajami,
                    "note": note,
                }
            )
        except Exception:
            logger.exception("Failed to send display_on_screen event")
            return {"shown": False}
        return {"shown": True}


def _register_student_interrupt_handler(agent: Agent, wrap_up: _GoAwayWrapUp) -> None:
    """Lets the learner explicitly interrupt the teacher mid-sentence.

    The mobile app's mic button (src/app/(home)/audio-lesson.native.tsx,
    MicInterruptButton) sends a Stream custom call event
    ({"type": "student_interrupt"}) via `call.sendCustomEvent(...)` on tap.

    There is no public Agent/EdgeTransport API in the installed vision-agents
    SDK for (a) receiving coordinator-level custom call events, or (b)
    triggering an interrupt directly outside of asking the LLM to say
    something (Agent.simple_response/say, which speak a new line rather than
    just going quiet). So this reaches into the same objects the SDK builds
    internally during `agent.join(call)`:
      - `agent._connection._connection` is the raw
        `getstream.video.rtc.ConnectionManager` for this call. It already
        re-emits the coordinator websocket's "custom" event (see
        `StreamEdge.join` in vision_agents.plugins.getstream.
        stream_edge_transport, which listens to the same connection for
        "participant_joined"/"track_published"/etc) — `.on("custom", ...)`
        below is the receiving half of the exact channel
        `agent.send_custom_event(...)` already uses to send the
        `ajami_display` event to the app.
      - `agent._flow.interrupt()` is the exact interrupt path
        `RealtimeInferenceFlow.process_llm_output` already calls for natural
        voice barge-in (its "Participant barged-in, interrupting the agent"
        log line, in vision_agents.core.agents.inference.realtime_flow) — it
        clears the LLM/audio-output buffers without asking the model to say
        anything new, so a tap just goes quiet instead of talking over the
        student.

    While `wrap_up.is_wrapping_up` is set (see `_GoAwayWrapUp`), the tap is
    ignored instead of interrupting — the GoAway goodbye is a short, scripted
    wrap-up that shouldn't be cut off, unlike the regular greeting/lesson
    barge-in, which stays interruptible (see M1 in prompts/19-self-audit.md).
    """
    raw_connection = agent._connection._connection

    async def _on_custom_event(message: dict) -> None:
        payload = message.get("custom") or {}
        if payload.get("type") != STUDENT_INTERRUPT_EVENT_TYPE:
            return
        if wrap_up.is_wrapping_up:
            logger.info("👉 Student tapped interrupt during GoAway wrap-up; ignoring")
            return
        logger.info("👉 Student tapped interrupt; stopping the teacher")
        await agent._flow.interrupt()

    raw_connection.on("custom", _on_custom_event)


def _register_caption_forwarding(agent: Agent) -> None:
    """Wires up the `_CaptionStream`s that `_GoAwayAwareRealtime` forwards
    transcript deltas into, and points them at `agent.edge.send_custom_event`
    (the same channel `display_on_screen` above uses) so the app's caption
    UI receives `caption` events for both speakers.

    Called from create_agent, before the call is joined — safe because
    `send_custom_event` is only actually invoked later, once transcripts
    start arriving during a joined call (same reasoning as
    `_register_display_tool` registering its tool ahead of time).
    """
    llm = agent.llm
    assert isinstance(llm, _GoAwayAwareRealtime)
    llm._caption_streams = {
        "learner": _CaptionStream(agent.edge.send_custom_event, "learner"),
        "teacher": _CaptionStream(agent.edge.send_custom_event, "teacher"),
    }


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
    # Our own attribute (not an SDK internal) so join_call can reach the
    # same _GoAwayWrapUp instance to gate student-interrupt suppression.
    agent.ajami_wrap_up = wrap_up

    @agent.llm.events.subscribe
    async def _on_realtime_disconnected(event: RealtimeDisconnectedEvent) -> None:
        await wrap_up.on_disconnected(clean=event.clean, reason=event.reason)

    _register_display_tool(agent)
    _register_caption_forwarding(agent)

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
        _register_student_interrupt_handler(agent, agent.ajami_wrap_up)

        lesson_title = lesson.get("title") if lesson else None
        greeting_instruction = (
            f"Gai da dalibi cikin dumi da Hausa, sannan ka fara darasi akan: {lesson_title}."
            if lesson_title
            else "Gai da dalibi cikin dumi da Hausa, sannan ka tambaye shi abin da yake son koya a yau."
        )
        await agent.simple_response(text=greeting_instruction)
        await agent.finish()


runner = Runner(
    AgentLauncher(
        create_agent=create_agent,
        join_call=join_call,
        # Reject a second concurrent session on the same call_id with 429
        # instead of stacking two agents on one call (see H2 in
        # prompts/19-self-audit.md).
        max_sessions_per_call=1,
    ),
    serve_options=ServeOptions(
        can_start_session=_require_vision_agent_secret,
        can_close_session=_require_vision_agent_secret,
        can_view_session=_require_vision_agent_secret,
        can_view_metrics=_require_vision_agent_secret,
    ),
)


if __name__ == "__main__":
    runner.cli()
