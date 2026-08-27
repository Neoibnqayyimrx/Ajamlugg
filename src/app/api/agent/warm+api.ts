/**
 * app/api/agent/warm+api.ts
 *
 * Wakes the vision-agent service so it isn't cold when a lesson starts.
 *
 * The agent is hosted on a tier that spins the container down when idle; a
 * fully cold start has been measured at ~100s. That cost lands on whoever
 * starts the first lesson after an idle period — exactly the worst person to
 * charge it to. Pinging /health from the Learn screen starts the wake-up
 * while the learner is still choosing a lesson, so by the time they open one
 * the service is up (or well on its way).
 *
 * Deliberately trivial: no auth, no request body, no user input. It can only
 * ever hit the one hardcoded VISION_AGENT_URL, and /health returns no data.
 * The response says whether the agent was already awake, purely so the app
 * can decide whether to show a "your teacher is waking up" hint.
 *
 * This reduces the cold-start window; it does not remove it. Keeping the
 * service warm (paid tier, or an external uptime ping) is the actual fix.
 *
 * GET /api/agent/warm
 */

const VISION_AGENT_URL = process.env.VISION_AGENT_URL;

// Short: this is a best-effort nudge, not something anyone waits on. If the
// service is cold it will keep waking up after we've stopped listening —
// which is the entire point.
const WARM_PING_TIMEOUT_MS = 3_000;

export async function GET() {
  if (!VISION_AGENT_URL) {
    return Response.json({ warm: false, reason: "not-configured" });
  }

  try {
    const response = await fetch(`${VISION_AGENT_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(WARM_PING_TIMEOUT_MS),
    });
    // Answered inside the timeout → the container was already running.
    return Response.json({ warm: response.ok });
  } catch {
    // Timed out or refused: almost always a cold start now in progress.
    // Not an error — the ping did its job by triggering the wake-up.
    return Response.json({ warm: false, reason: "waking" });
  }
}
