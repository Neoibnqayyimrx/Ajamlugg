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
    return () => {
      teardown();
    };
  }, [teardown]);

  const start = useCallback(async () => {
    setErrorMessage(undefined);
    setTeacherJoinFailed(false);
    setStatus("connecting");

    const getClerkSessionToken = () => getToken();
    const sessionParams = { lessonId, languageId, lessonTitle };

    try {
      const session = await fetchStreamSession(getClerkSessionToken, sessionParams);
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
      setClient(videoClient);

      setStatus("joining");
      const activeCall = videoClient.call(session.callType, session.callId, {
        reuseInstance: true,
      });
      await activeCall.join({ create: true });

      // Audio-only lesson: keep video off, make sure the mic is live.
      await activeCall.camera.disable().catch(() => undefined);
      await activeCall.microphone
        .enable()
        .catch((err) => console.error("Failed to enable microphone", err));

      setCall(activeCall);
      setStatus("joined");
    } catch (err) {
      console.error("Failed to start the lesson call", err);
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, [getToken, lessonId, languageId, lessonTitle, userName, userImage]);

  const endCall = useCallback(async () => {
    await teardown();
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
