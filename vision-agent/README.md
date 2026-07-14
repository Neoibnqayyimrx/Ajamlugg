# vision-agent — Ajami's Audio Lesson teacher

A Python voice agent (built with [vision-agents](https://visionagents.ai) and
Gemini Live) that teaches Ajami (Arabic-script Hausa) through Hausa, for the
Audio Lesson feature. It joins the same Stream call the mobile app already
reserved — it does not create its own parallel call flow.

How it plugs into the app:

1. The mobile app calls `POST /api/stream/session` ([src/app/api/stream/session+api.ts](../src/app/api/stream/session+api.ts)),
   which reserves a private `default`-type Stream call scoped to
   `(languageId, lessonId, userId)` and now also pings this service's
   `POST /calls/:callId/sessions` so the teacher joins as a second participant.
2. On join, the agent reads `lessonId`/`languageId` from the call's custom
   data (set at reservation time — never hardcoded here) and fetches the
   lesson's content (title, goals, `aiTeacherPrompt`, vocabulary) from the
   app's own `GET /api/lessons/:lessonId` route.
3. It builds a Hausa-only system prompt from the base persona + that lesson
   content, connects to Gemini Live (`speech_config.language_code = "ha"`),
   and greets the learner.

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `GEMINI_API_KEY` — same value as the parent repo's `.env`.
   - `STREAM_API_KEY` / `STREAM_API_SECRET` — same values as the parent repo's `.env`.
   - `LESSON_API_BASE_URL` — base URL of the running Expo app (defaults to `http://localhost:8081`).
2. Install dependencies:

   ```bash
   uv sync
   ```

3. Run the agent:

   ```bash
   uv run agent.py run     # single-call console (opens a browser demo)
   uv run agent.py serve   # HTTP server — POST /calls/:callId/sessions to join a call
   ```

4. Run the tests:

   ```bash
   uv run pytest
   ```

## Manual verification scripts

- `scripts/verify_hausa.py` — connects directly to Gemini Live (no call
  involved), sends a Hausa greeting, prints the transcribed reply, and saves
  a WAV so you can listen to the voice quality.
- `scripts/make_test_call.py` — creates a Stream call using the exact same
  id/custom-data convention as `session+api.ts`, so you can hit
  `POST /calls/:callId/sessions` on this service and watch it join for real
  without needing the mobile app running.

## Docker

```bash
docker build -t vision-agent .
docker run --env-file .env -p 8000:8000 vision-agent
```
