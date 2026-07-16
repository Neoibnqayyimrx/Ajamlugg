/**
 * app/api/stream/session+api.ts
 *
 * Server-only route: verifies the caller's Clerk session, mints a Stream
 * Video user token, and reserves the lesson's audio call — all in one
 * request so the client never sees the Stream API secret or names its own
 * Stream user id.
 *
 * POST body: { lessonId: string; languageId: string; lessonTitle?: string }
 * Auth: "Authorization: Bearer <clerk session token>" (from useAuth().getToken())
 */

import { verifyToken } from "@clerk/backend";
import { StreamClient } from "@stream-io/node-sdk";

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const VISION_AGENT_URL = process.env.VISION_AGENT_URL;
const VISION_AGENT_SECRET = process.env.VISION_AGENT_SECRET;

const TOKEN_VALIDITY_SECONDS = 60 * 60 * 4; // ~4h, SDK refreshes via tokenProvider
const CALL_TYPE = "default";

/**
 * Has the Ajami teacher (vision-agent/, Gemini Live) join the call as a
 * second participant. Best-effort: the learner can still have their audio
 * lesson call without the AI teacher, so a failure here is logged, not
 * thrown — the client isn't blocked on it. The boolean return (did the
 * agent-start request succeed?) is surfaced in the session response so the
 * client can show a "teacher not available" state instead of silently
 * waiting for a teacher that will never join.
 */
async function requestTeacherJoin(callId: string): Promise<boolean> {
  if (!VISION_AGENT_URL || !VISION_AGENT_SECRET) {
    // Not thrown as a 500: the learner can still have their audio lesson
    // call without the AI teacher (see the docstring above). But silently
    // returning false here would mean a missing/misconfigured env var in
    // production never shows up anywhere — every call would just quietly
    // never get a teacher with no trace in the logs.
    console.error(
      "VISION_AGENT_URL/VISION_AGENT_SECRET is not configured — the AI teacher will not join any calls."
    );
    return false;
  }

  try {
    const response = await fetch(`${VISION_AGENT_URL}/calls/${callId}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Vision-Agent-Secret": VISION_AGENT_SECRET,
      },
      body: JSON.stringify({ call_type: CALL_TYPE }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(
        `vision-agent session-start failed for call ${callId}: ${response.status}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Failed to reach vision-agent for call ${callId}`, err);
    return false;
  }
}

async function resolveUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const sessionToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!sessionToken || !CLERK_SECRET_KEY) return null;

  try {
    const verified = await verifyToken(sessionToken, { secretKey: CLERK_SECRET_KEY });
    return verified.sub;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!STREAM_API_KEY || !STREAM_API_SECRET || !CLERK_SECRET_KEY) {
    return Response.json({ error: "Stream/Clerk server env is not configured" }, { status: 500 });
  }

  const userId = await resolveUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { lessonId?: string; languageId?: string; lessonTitle?: string }
    | null;
  const lessonId = body?.lessonId;
  const languageId = body?.languageId;
  if (!lessonId || !languageId) {
    return Response.json({ error: "lessonId and languageId are required" }, { status: 400 });
  }

  const streamClient = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);

  const token = streamClient.generateUserToken({
    user_id: userId,
    validity_in_seconds: TOKEN_VALIDITY_SECONDS,
  });

  // One private call per (user, lesson) — so different learners doing the
  // same lesson don't land in each other's audio session.
  const callId = `${languageId}-${lessonId}-${userId}`.replace(/[^a-zA-Z0-9_-]/g, "-");

  try {
    await streamClient.video.call(CALL_TYPE, callId).getOrCreate({
      data: {
        created_by_id: userId,
        members: [{ user_id: userId }],
        custom: { lessonId, languageId, lessonTitle: body?.lessonTitle ?? null },
      },
    });
  } catch (err) {
    console.error("Stream call reservation failed", err);
    return Response.json({ error: "Failed to reserve the lesson call" }, { status: 502 });
  }

  const teacherJoinOk = await requestTeacherJoin(callId);

  return Response.json({
    apiKey: STREAM_API_KEY,
    userId,
    token,
    callId,
    callType: CALL_TYPE,
    teacherJoinFailed: !teacherJoinOk,
  });
}
