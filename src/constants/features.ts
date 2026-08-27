/**
 * src/constants/features.ts
 *
 * Build-time feature flags.
 *
 * These are read from `EXPO_PUBLIC_*` variables, which Expo inlines at bundle
 * time. They are not runtime configuration and not per-user: flipping one
 * requires a rebuild. That is the right trade for gating a whole feature area
 * — it keeps the disabled path out of the shipped experience without adding a
 * config service the app would then have to fetch before it could render.
 */

/**
 * Whether the AI Teacher (Stream audio call + the Gemini-backed vision-agent)
 * is offered to learners.
 *
 * OFF by default, and deliberately so. Lessons are pre-built content graded
 * on-device; the AI teacher is an optional extra that depends on
 * GEMINI_API_KEY, VISION_AGENT_URL, VISION_AGENT_SECRET and a running
 * vision-agent service. With the flag off, a build with none of those set is
 * fully functional — which is the acceptance test for the content refactor.
 *
 * Turning it on shows the AI Teacher tab and the home screen's promo banner.
 * It never becomes required: no lesson depends on it either way.
 *
 * The feature's code is intentionally left in the repo (see vision-agent/ and
 * src/app/api/stream/session+api.ts) so it can return as a premium add-on.
 */
export const AI_TEACHER_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_AI_TEACHER === "true";
