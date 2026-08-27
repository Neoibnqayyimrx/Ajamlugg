# Ajamlugg

**Learn. Read. Preserve.**

A mobile app for learning to read and write African languages in *Ajami* —
the Arabic script as it has been adapted for Hausa, Swahili, Wolof, Yoruba,
and Fulfulde. Learners work through structured lessons and practise out loud
with an AI teacher that speaks to them in their own language over a live
audio call.

Hausa Ajami is the language available today; the others are modelled in the
content system and marked "coming soon" in the app.

---

## What's in the repo

| Path | What it is |
| --- | --- |
| [`src/app/`](src/app/) | Expo Router screens + server routes (`+api.ts`) |
| [`src/data/`](src/data/) | The lesson content system — languages, units, lessons |
| [`src/hooks/useAudioLessonCall.ts`](src/hooks/useAudioLessonCall.ts) | Owns the Stream Video call for one lesson session |
| [`src/store/`](src/store/) | Zustand + AsyncStorage state (language, progress, captions) |
| [`vision-agent/`](vision-agent/) | Python voice agent — the AI teacher (Gemini Live) |
| [`prompts/`](prompts/) | Build log: the prompt-by-prompt history of how this was made |

## How the AI lesson works

The interesting part of the architecture is that the app and the AI teacher
meet inside a Stream Video call that neither of them creates unilaterally:

1. The learner opens a lesson. The app calls `POST /api/stream/session`
   ([session+api.ts](src/app/api/stream/session+api.ts)) with their Clerk
   session token.
2. That route **verifies the token server-side**, derives the Stream user id
   from it (the client never names its own id), mints a Stream token, and
   reserves a private call scoped to `(language, lesson, user)`. The Stream
   API secret never leaves the server.
3. The same route pings the `vision-agent` service, which joins that call as
   a second participant.
4. The agent reads the lesson id from the call's custom data, fetches the
   lesson content from `GET /api/lessons/:lessonId`, builds a Hausa-only
   system prompt from it, and starts teaching.
5. Both sides' speech is transcribed and pushed back to the app as Stream
   custom events, which render as live captions.

## Running it locally

The app and agent are already deployed (see [Deploying](#deploying)) — a
development build runs against that live backend without anything on your
machine. The steps below are for working on the backend pieces themselves.

```bash
# 1. Install
npm install

# 2. Configure — fill in every key
cp .env.example .env

# 3. Start the app (also serves the +api.ts routes on :8081)
npm start

# 4. In a second terminal, start the AI teacher
cd vision-agent
cp .env.example .env      # fill in, then:
uv sync
uv run agent.py serve
```

The audio lesson needs a **development build**, not Expo Go — it depends on
`react-native-webrtc` native modules. See
[Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

### Checks

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint

cd vision-agent
uv run pytest -m "not integration"   # fast, offline — what CI runs
uv run pytest -m integration         # calls the real Gemini API (uses quota)
```

## Deploying

Three independently-deployed pieces:

| Piece | Runs on |
| --- | --- |
| `vision-agent/` (AI teacher) | Render, Docker — [`Dockerfile`](vision-agent/Dockerfile) |
| API routes + web bundle | EAS Hosting (`eas deploy`) |
| Mobile app | EAS Build (binaries) + EAS Update (OTA) |

Deployment config lives in `DEPLOYMENT.md` (kept out of version control) and
[`eas.json`](eas.json). Build-time and server-side variables come from **EAS
environment variables**, not from `.env` — `.env` is local development only.

> **Cold starts.** The agent's hosting tier spins the container down when
> idle; a fully cold start takes ~100s. The join path tolerates this (see
> `TEACHER_JOIN_REQUEST_TIMEOUT_MS` in
> [session+api.ts](src/app/api/stream/session+api.ts)), but the first lesson
> after an idle period will have the teacher arrive late. Keep the service
> warm before any live demo.

## Status

An MVP. What's real: authentication, the lesson content system, the live
audio call with the AI teacher, live captions, and locally-persisted
progress (streak, XP, completed lessons). What isn't yet: a server-side
progress backend, skill scoring, the Chat and AI Teacher tabs, and languages
beyond Hausa.

## License

See [LICENSE](LICENSE).
