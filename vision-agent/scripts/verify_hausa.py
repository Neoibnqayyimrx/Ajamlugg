"""Standalone check: can Gemini Live speak and understand Hausa well enough to teach with?

Connects directly to GeminiRealtime (no call/edge involved), sends a Hausa
greeting as text, and prints the model's spoken reply (via output
transcription) plus a saved WAV of the audio so it can be listened to.

Run: uv run python scripts/verify_hausa.py
"""

import asyncio
import os
import wave

from dotenv import load_dotenv
from google.genai.types import (
    AudioTranscriptionConfigDict,
    LiveConnectConfigDict,
    PrebuiltVoiceConfigDict,
    SpeechConfigDict,
    VoiceConfigDict,
)

from vision_agents.core.llm.realtime import (
    RealtimeAgentTranscript,
    RealtimeAudioOutput,
    RealtimeAudioOutputDone,
    RealtimeUserTranscript,
)
from vision_agents.plugins.gemini import Realtime

load_dotenv()

INSTRUCTIONS = (
    "Kai malami ne mai kirki, kana koyar da Ajami (rubutun Hausa da harafin "
    "Larabci) ta hanyar Hausa. Ka yi magana da Hausa kawai."
)

GREETING = "Sannu! Yaya kake? Ina son koyon Ajami."

OUT_WAV = "hausa_check.wav"


async def main() -> None:
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
        raise SystemExit("Set GEMINI_API_KEY in vision-agent/.env before running this check.")

    llm = Realtime(
        config=LiveConnectConfigDict(
            input_audio_transcription=AudioTranscriptionConfigDict(),
            output_audio_transcription=AudioTranscriptionConfigDict(),
            speech_config=SpeechConfigDict(
                voice_config=VoiceConfigDict(
                    prebuilt_voice_config=PrebuiltVoiceConfigDict(voice_name="Leda")
                ),
                language_code="ha",
            ),
        )
    )
    llm.set_instructions(INSTRUCTIONS)

    await llm.connect()
    print(f"Connected. Sending greeting: {GREETING!r}")

    async for _delta in llm.simple_response(text=GREETING):
        pass

    transcript_parts: list[str] = []
    audio_chunks: list[bytes] = []
    sample_rate = 24000

    try:
        async with asyncio.timeout(20):
            async for event in llm.output:
                if isinstance(event, RealtimeAgentTranscript):
                    transcript_parts.append(event.text)
                elif isinstance(event, RealtimeAudioOutput):
                    audio_chunks.append(event.data.samples.tobytes())
                    sample_rate = event.data.sample_rate or sample_rate
                elif isinstance(event, RealtimeAudioOutputDone):
                    break
    except TimeoutError:
        print("Timed out waiting for a full response (20s).")

    await llm.close()

    full_text = "".join(transcript_parts)
    print("\n--- Model's spoken reply (transcribed) ---")
    print(full_text or "(no transcript received)")

    if audio_chunks:
        with wave.open(OUT_WAV, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(b"".join(audio_chunks))
        print(f"\nSaved {len(audio_chunks)} audio chunks to {OUT_WAV} ({sample_rate} Hz)")
    else:
        print("\nNo audio chunks received.")


if __name__ == "__main__":
    asyncio.run(main())
