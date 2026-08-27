/**
 * services/api/stream.ts
 *
 * Client-side helper for the Stream Video session route. Never asks the
 * server for a specific user id — the Clerk session token in the
 * Authorization header is the only identity signal, and the server derives
 * the Stream user id from it.
 */

import Constants from "expo-constants";

export interface StreamSession {
  apiKey: string;
  userId: string;
  token: string;
  callId: string;
  callType: string;
  /** True if the server-side vision-agent (AI teacher) start request failed. */
  teacherJoinFailed: boolean;
}

interface StreamSessionParams {
  lessonId: string;
  languageId: string;
  lessonTitle?: string;
}

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  }
  // Dev: derive the Metro/Expo dev server host so native clients can reach
  // the local +api.ts route (there is no browser origin to fall back on).
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return `http://${hostUri.split(":")[0]}:8081`;
  }
  throw new Error(
    "Unable to resolve the API base URL — set EXPO_PUBLIC_API_BASE_URL for this build."
  );
}

/**
 * Nudge the AI teacher service awake ahead of time. Fire-and-forget: nothing
 * waits on it and failures are ignored, since it is an optimisation, not a
 * step in starting a lesson.
 *
 * Called from the Learn screen so the wake-up overlaps with the learner
 * browsing lessons instead of with them waiting to start one.
 */
export function warmAgentService(): void {
  let url: string;
  try {
    url = `${getApiBaseUrl()}/api/agent/warm`;
  } catch {
    return; // No resolvable API host (e.g. bare web build) — nothing to warm.
  }
  fetch(url, { method: "GET" }).catch(() => undefined);
}

export async function fetchStreamSession(
  getClerkSessionToken: () => Promise<string | null>,
  params: StreamSessionParams
): Promise<StreamSession> {
  const sessionToken = await getClerkSessionToken();
  if (!sessionToken) {
    throw new Error("Not signed in");
  }

  const response = await fetch(`${getApiBaseUrl()}/api/stream/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Stream session request failed (${response.status})`);
  }

  return response.json();
}
