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

const TOKEN_VALIDITY_SECONDS = 60 * 60 * 4; // ~4h, SDK refreshes via tokenProvider
const CALL_TYPE = "default";

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

  return Response.json({
    apiKey: STREAM_API_KEY,
    userId,
    token,
    callId,
    callType: CALL_TYPE,
  });
}
