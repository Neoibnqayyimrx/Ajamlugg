/**
 * hooks/useAudioLessonCall.ts
 *
 * Owns the Stream Video client + Call for one audio-lesson session:
 * fetches a session from the server (token + reserved call id), joins as
 * audio-only (camera stays off), and exposes mute/end actions. The screen
 * only reads `status`/`call`/`client` — it never talks to the Stream SDK
 * directly.
 */

import { useAuth } from "@clerk/clerk-expo";
import {
  Call,
  CallingState,
  StreamVideoClient,
  type TokenProvider,
  type User,
} from "@stream-io/video-react-native-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchStreamSession } from "@/services/api/stream";

export type AudioLessonCallStatus =
  | "idle"
  | "connecting"
  | "joining"
  | "joined"
  | "error"
  | "ended";

interface UseAudioLessonCallParams {
  lessonId: string;
  languageId: string;
  lessonTitle: string;
  userName: string;
  userImage?: string | null;
}

export function useAudioLessonCall({
  lessonId,
  languageId,
  lessonTitle,
  userName,
  userImage,
}: UseAudioLessonCallParams) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<AudioLessonCallStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [client, setClient] = useState<StreamVideoClient>();
  const [call, setCall] = useState<Call>();
  const [teacherJoinFailed, setTeacherJoinFailed] = useState(false);

  // Cleanup reads the latest instances without re-registering the effect.
  const clientRef = useRef(client);
  const callRef = useRef(call);
  useEffect(() => {
    clientRef.current = client;
    callRef.current = call;
  }, [client, call]);

  // Flipped false by the unmount cleanup below. start() checks this after
  // every await so it never joins/enables the mic/sets state once the
  // component is gone — see H1 in prompts/19-self-audit.md.
  const mountedRef = useRef(true);

  // Ref-based in-flight guard: setState-driven `disabled={busy}` on the
  // start button only takes effect after a re-render, so two taps in the
  // same event-loop tick could both run start() to completion and join two
  // agent sessions onto the same call. This ref is synchronous — see H2 in
  // prompts/19-self-audit.md.
  const startGuardRef = useRef(false);

  const teardown = useCallback(async () => {
    const activeCall = callRef.current;
    if (activeCall && activeCall.state.callingState !== CallingState.LEFT) {
      await activeCall.leave().catch((err) => console.error("Failed to leave call", err));
    }
    await clientRef.current?.disconnectUser().catch((err) =>
      console.error("Failed to disconnect Stream user", err)
    );
    setCall(undefined);
    setClient(undefined);
  }, []);

  // Guards against a dangling call/socket if the learner navigates away
  // without pressing "End Call".
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      teardown();
    };
  }, [teardown]);

  const start = useCallback(async () => {
    if (startGuardRef.current) return;
    startGuardRef.current = true;

    // Tears down whatever was created so far and aborts start() once the
    // component has unmounted mid-flight. Uses the local variables (not
    // clientRef/callRef) because those refs only sync via an effect that
    // won't fire again after unmount.
    const abortIfUnmounted = async (
      callToLeave?: Call,
      clientToDisconnect?: StreamVideoClient
    ): Promise<boolean> => {
      if (mountedRef.current) return false;
      if (callToLeave && callToLeave.state.callingState !== CallingState.LEFT) {
        await callToLeave.leave().catch((err) => console.error("Failed to leave call", err));
      }
      await clientToDisconnect?.disconnectUser().catch((err) =>
        console.error("Failed to disconnect Stream user", err)
      );
      startGuardRef.current = false;
      return true;
    };

    setErrorMessage(undefined);
    setTeacherJoinFailed(false);
    setStatus("connecting");

    const getClerkSessionToken = () => getToken();
    const sessionParams = { lessonId, languageId, lessonTitle };

    try {
      const session = await fetchStreamSession(getClerkSessionToken, sessionParams);
      if (await abortIfUnmounted()) return;
      setTeacherJoinFailed(session.teacherJoinFailed);

      const user: User = {
        id: session.userId,
        name: userName,
        image: userImage ?? undefined,
      };
      const tokenProvider: TokenProvider = async () => {
        const fresh = await fetchStreamSession(getClerkSessionToken, sessionParams);
        return fresh.token;
      };

      const videoClient = StreamVideoClient.getOrCreateInstance({
        apiKey: session.apiKey,
        user,
        token: session.token,
        tokenProvider,
      });
      if (await abortIfUnmounted(undefined, videoClient)) return;
      setClient(videoClient);

      setStatus("joining");
      const activeCall = videoClient.call(session.callType, session.callId, {
        reuseInstance: true,
      });
      await activeCall.join({ create: true });
      if (await abortIfUnmounted(activeCall, videoClient)) return;

      // Audio-only lesson: keep video off, make sure the mic is live.
      await activeCall.camera.disable().catch(() => undefined);
      await activeCall.microphone
        .enable()
        .catch((err) => console.error("Failed to enable microphone", err));
      if (await abortIfUnmounted(activeCall, videoClient)) return;

      setCall(activeCall);
      setStatus("joined");
    } catch (err) {
      console.error("Failed to start the lesson call", err);
      if (mountedRef.current) {
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      }
      startGuardRef.current = false;
    }
  }, [getToken, lessonId, languageId, lessonTitle, userName, userImage]);

  const endCall = useCallback(async () => {
    await teardown();
    startGuardRef.current = false;
    setStatus("ended");
  }, [teardown]);

  const toggleMic = useCallback(async () => {
    try {
      await callRef.current?.microphone.toggle();
    } catch (err) {
      console.error("Failed to toggle microphone", err);
    }
  }, []);

  return {
    status,
    errorMessage,
    client,
    call,
    teacherJoinFailed,
    start,
    endCall,
    toggleMic,
  };
}
