/**
 * app/(home)/audio-lesson.native.tsx
 *
 * AI Teacher — Audio Lesson screen (07-audio-lesson-screen design).
 *
 * `.native.tsx`: this route uses @stream-io/video-react-native-sdk (via
 * hooks/useAudioLessonCall.ts too), which touches native modules
 * (requireNativeComponent) that don't exist in the web/server bundle. Metro
 * only resolves this file for iOS/Android; web/server rendering falls back
 * to the plain audio-lesson.tsx in this same folder, which has no native
 * Stream Video dependency at all. Keep both in sync for shared UI/data
 * logic that isn't call-specific.
 *
 * Opened from the Learn screen with a `lessonId` param. This is an
 * AUDIO-ONLY experience — camera stays off for the whole session. The
 * learner explicitly starts the session; once joined, mic mute/unmute and
 * end-call are backed by a real Stream Video audio call (see
 * hooks/useAudioLessonCall.ts), scoped to the signed-in Clerk user, the
 * selected language, and the selected lesson.
 *
 * Everything else is still driven by the hardcoded learning data:
 *   - language        → LANGUAGES (via the lesson's unit)
 *   - title / goals   → LESSONS
 *   - phrases         → vocabulary embedded in the lesson's activities
 *   - teacher context → lesson.aiTeacherPrompt
 *
 * The teacher actually speaks through the live AI agent (see
 * vision-agent/agent.py) over the Stream Video call; what it (and the
 * learner) say is shown live via the caption bar in TeacherStage, driven by
 * "caption" custom call events.
 */

import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
  StreamCall,
  StreamVideo,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressBar } from "@/components/ui/progress-bar";
import { Text as AjamiText } from "@/components/ui/text";
import images from "@/constants/images";
import { LANGUAGES } from "@/data/languages";
import { LESSONS } from "@/data/lessons";
import { UNITS } from "@/data/units";
import { AudioLessonCallStatus, useAudioLessonCall } from "@/hooks/useAudioLessonCall";
import { useCaptionsStore } from "@/store/useCaptionsStore";
import {
  selectStreakDays,
  selectXpToday,
  useProgressStore,
  XP_PER_LESSON,
} from "@/store/useProgressStore";
import { Lesson, Vocabulary } from "@/types/learning";

// ─── Palette (matches home + learn screens) ───────────────────────────────────

const C = {
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  green: "#1B6B3A",
  greenLight: "#E8F5EE",
  gold: "#D4A017",
  goldLight: "#FDF6E3",
  text: "#1A1A1A",
  textSub: "#6B7280",
  border: "#EDE8E0",
  endRed: "#D95040",
  muted: "#9CA3AF",
  amber: "#D97706",
  info: "#2E86DE",
};

// The vision-agent teacher's Stream user id (see AGENT_USER in
// vision-agent/agent.py) and the custom call event type it listens for to
// trigger an explicit student-initiated interrupt (see student_interrupt
// handling registered in that same file).
const TEACHER_USER_ID = "ajami-teacher";
const STUDENT_INTERRUPT_EVENT_TYPE = "student_interrupt";
// How long to wait for the teacher's participant to appear before showing the
// "Teacher unavailable" banner. Sized for a cold start of the vision-agent
// service (measured at ~100s from fully spun down), not for the warm case —
// at 20s the banner fired during a perfectly healthy cold start and told the
// learner the teacher wasn't coming seconds before it arrived.
//
// Showing it late costs nothing: `teacherPresent` takes priority in
// teacherStatus below, so the moment the teacher joins the banner goes away
// on its own, whether or not this timer has elapsed.
const TEACHER_JOIN_TIMEOUT_MS = 120_000;

type TeacherStatus = "joining" | "joined" | "not-available";

// ─── Skill areas the AI teacher will eventually score ─────────────────────────
// Labels only — no numbers. The agent does not grade the learner yet, so
// anything quantitative here would be invented. Shown as an explicit
// "coming soon" preview rather than fabricated ratings, which would read as
// real assessment to anyone using the app.

const SKILL_AREAS = [
  { id: "speaking", label: "Speaking", icon: "megaphone" as const },
  { id: "pronunciation", label: "Pronunciation", icon: "mic" as const },
  { id: "grammar", label: "Grammar", icon: "book" as const },
];

// ─── Live captions (AI teacher's + learner's realtime transcript) ─────────────
// Rendered from Stream custom call events of type "caption" (see
// CAPTION_EVENT_TYPE in vision-agent/agent.py, which forwards the realtime
// transcripts the vision_agents SDK already produces for both speakers,
// batched per utterance). Replaces the old tap-to-advance mock script bubble
// that used to live in TeacherStage — one caption system, no duplicates.

type CaptionSpeaker = "teacher" | "learner";

interface CaptionPayload {
  type: "caption";
  speaker: CaptionSpeaker;
  text: string;
  /** True once the utterance is complete; omitted/false while still building up. */
  final?: boolean;
}

function isCaptionPayload(data: unknown): data is CaptionPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.type === "caption" &&
    (d.speaker === "teacher" || d.speaker === "learner") &&
    typeof d.text === "string"
  );
}

interface CaptionLine {
  speaker: CaptionSpeaker;
  text: string;
}

interface CaptionState {
  /** The utterance currently building up (not yet finalized), if any. */
  current: CaptionLine | null;
  /** The last utterance that finished, shown once `current` clears. */
  recent: CaptionLine | null;
}

const INITIAL_CAPTION_STATE: CaptionState = { current: null, recent: null };

// Pure reducer — kept side-effect-free so fragment accumulation can be
// verified headlessly without mounting the screen (see manual test
// checklist / test script referenced in the PR).
function reduceCaptionEvent(state: CaptionState, event: CaptionPayload): CaptionState {
  if (!event.text) return state;
  if (event.final) {
    return { current: null, recent: { speaker: event.speaker, text: event.text } };
  }
  return { ...state, current: { speaker: event.speaker, text: event.text } };
}

function LiveCaptionBar({ state, dimmed }: { state: CaptionState; dimmed: boolean }) {
  const line = state.current ?? state.recent;
  if (!line) return null;

  const isTeacher = line.speaker === "teacher";
  const building = state.current !== null;

  return (
    <View
      className="absolute bottom-4 left-4 right-4 bg-[#FFFFFF] rounded-2xl px-4 py-3.5 flex-row items-start gap-3 shadow-md"
      style={{ opacity: dimmed ? 0.55 : 1 }}
    >
      <View className="w-9 h-9 rounded-full bg-[#FDF6E3] items-center justify-center">
        <Ionicons
          name={isTeacher ? "sparkles" : "mic"}
          size={18}
          color={isTeacher ? C.gold : C.green}
        />
      </View>
      <View className="flex-1">
        <Text className="font-poppins-semibold text-[11px] text-[#6B7280]">
          {isTeacher ? "Teacher" : "You"}
        </Text>
        <Text
          className="font-poppins-regular text-[15px] text-[#1A1A1A]"
          style={{ opacity: building ? 1 : 0.6 }}
          numberOfLines={3}
        >
          {line.text}
        </Text>
      </View>
    </View>
  );
}

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function statusMeta(status: AudioLessonCallStatus) {
  switch (status) {
    case "joined":
      return { label: "Live", dot: "#22C55E" };
    case "connecting":
      return { label: "Connecting…", dot: C.amber };
    case "joining":
      return { label: "Joining…", dot: C.amber };
    case "error":
      return { label: "Connection error", dot: C.endRed };
    case "ended":
      return { label: "Call ended", dot: C.muted };
    default:
      return { label: "Ready", dot: C.muted };
  }
}

function teacherStatusMeta(status: TeacherStatus) {
  switch (status) {
    case "joined":
      return { label: "Teacher connected", dot: "#22C55E" };
    case "not-available":
      return { label: "Teacher unavailable", dot: C.endRed };
    default:
      return { label: "Teacher joining…", dot: C.amber };
  }
}

// ─── Header ────────────────────────────────────────────────────────────────────

function SessionHeader({
  onBack,
  status,
  isLive,
  onEndCall,
}: {
  onBack: () => void;
  status: AudioLessonCallStatus;
  isLive: boolean;
  onEndCall: () => void;
}) {
  const meta = statusMeta(status);
  return (
    <View className="flex-row items-center px-5 pt-2 gap-2">
      <Pressable onPress={onBack} className="w-10 h-10 items-center justify-center -ml-2.5">
        <Ionicons name="chevron-back" size={26} color={C.green} />
      </Pressable>

      <View className="flex-1">
        <Text className="font-poppins-bold text-[26px] text-[#1B6B3A]">AI Teacher</Text>
        <View className="flex-row items-center gap-1.5">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.dot }} />
          <Text className="font-poppins-regular text-[13px] text-[#6B7280]">{meta.label}</Text>
        </View>
      </View>

      {/* Audio-only session: the camera stays off, shown as a muted badge */}
      <View className="w-10 h-10 rounded-md bg-[#FFFFFF] items-center justify-center shadow-sm">
        <Ionicons name="videocam-off-outline" size={20} color={C.muted} />
      </View>
      <View className="flex-row items-center bg-[#FFFFFF] rounded-md px-2.5 h-10 gap-1.5 shadow-sm">
        <Image source={images.streakFire} className="w-5 h-5" resizeMode="contain" />
        <Text className="font-poppins-bold text-[#1A1A1A] text-sm">12</Text>
      </View>
      <Pressable className="w-10 h-10 rounded-md bg-[#FFFFFF] items-center justify-center shadow-sm">
        <Ionicons name="notifications-outline" size={20} color={C.text} />
      </Pressable>

      {/* End call: deliberately smaller than the other header icons and set
          apart at the far top-right corner so it isn't accidentally tapped
          alongside the other controls. Only shown once the call is live. */}
      {isLive && (
        <Pressable
          onPress={onEndCall}
          hitSlop={4}
          className="w-8 h-8 rounded-full bg-[#D95040] items-center justify-center shadow-sm"
        >
          <Ionicons name="call" size={16} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

// ─── Learner avatar tile (shared by the pre-call and live stages) ─────────────

function LearnerTile({
  avatarUrl,
  userName,
  micBadge,
}: {
  avatarUrl?: string | null;
  userName: string;
  micBadge?: React.ReactNode;
}) {
  return (
    <View className="absolute top-3 right-3 w-[92px] h-[116px] rounded-2xl overflow-hidden border-2 border-[#FFFFFF] bg-[#E8F5EE]">
      <Image
        source={avatarUrl ? { uri: avatarUrl } : images.mascotLogo}
        className="w-full h-full"
        resizeMode="cover"
      />
      <View className="absolute bottom-0 left-0 right-0 bg-[#1A1A1A]/60 px-1.5 py-1">
        <Text className="font-poppins-semibold text-[10px] text-[#FFFFFF]" numberOfLines={1}>
          {userName}
        </Text>
      </View>
      {micBadge}
    </View>
  );
}

// ─── Teacher preview card (live session) ───────────────────────────────────────
// Visual placeholder only (no video): warm artwork backdrop, the mascot as
// the teacher, the learner's avatar tile, and the live caption bar.

function TeacherStage({
  lessonLabel,
  elapsed,
  micOn,
  avatarUrl,
  userName,
  teacherStatus,
  captionState,
  captionsEnabled,
  onToggleCaptions,
  hasDisplayCard,
}: {
  lessonLabel: string;
  elapsed: string;
  micOn: boolean;
  avatarUrl?: string | null;
  userName: string;
  teacherStatus: TeacherStatus;
  captionState: CaptionState;
  captionsEnabled: boolean;
  onToggleCaptions: () => void;
  hasDisplayCard: boolean;
}) {
  const teacherMeta = teacherStatusMeta(teacherStatus);

  return (
    <View className="mx-5 mt-3 h-[420px] rounded-3xl overflow-hidden bg-[#EADFC8]">
      {/* Backdrop artwork (teacher preview placeholder — not a video feed) */}
      <Image source={images.palace} className="absolute w-full h-full" resizeMode="cover" />

      {/* Mascot teacher */}
      <Image
        source={images.mascotWelcome}
        className="absolute bottom-0 self-center w-[240px] h-[280px]"
        resizeMode="contain"
      />

      {/* Top-left: lesson + live session status chips */}
      <View className="absolute top-3 left-3 gap-1.5 max-w-[60%]">
        <View className="bg-[#1A1A1A]/60 rounded-full px-3 py-1.5 self-start">
          <Text className="font-poppins-semibold text-[11px] text-[#FFFFFF]" numberOfLines={1}>
            {lessonLabel}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 bg-[#1A1A1A]/60 rounded-full px-3 py-1.5 self-start">
          <View className="w-1.5 h-1.5 rounded-full bg-[#D95040]" />
          <Text className="font-poppins-semibold text-[11px] text-[#FFFFFF]">
            Audio lesson · {elapsed}
          </Text>
        </View>
        {/* Subtle teacher connection status, near the teacher's tile */}
        <View className="flex-row items-center gap-1.5 bg-[#1A1A1A]/60 rounded-full px-3 py-1.5 self-start">
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teacherMeta.dot }} />
          <Text className="font-poppins-semibold text-[11px] text-[#FFFFFF]">
            {teacherMeta.label}
          </Text>
        </View>
        {/* Live captions on/off — default ON; for listening practice learners
            may want them hidden. Preference persists (see useCaptionsStore). */}
        <Pressable
          onPress={onToggleCaptions}
          className="flex-row items-center gap-1.5 bg-[#1A1A1A]/60 rounded-full px-3 py-1.5 self-start"
        >
          <Ionicons
            name={captionsEnabled ? "chatbox-ellipses" : "chatbox-ellipses-outline"}
            size={12}
            color={captionsEnabled ? "#8FE3B0" : "#FFFFFF"}
          />
          <Text
            className="font-poppins-semibold text-[11px]"
            style={{ color: captionsEnabled ? "#8FE3B0" : "#FFFFFF" }}
          >
            Captions {captionsEnabled ? "on" : "off"}
          </Text>
        </Pressable>
      </View>

      {/* Top-right: learner tile (avatar + name — audio only, no camera) */}
      <LearnerTile
        avatarUrl={avatarUrl}
        userName={userName}
        micBadge={
          <View className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-[#1B6B3A] items-center justify-center border border-[#FFFFFF]">
            <Ionicons name={micOn ? "mic" : "mic-off"} size={13} color="#FFFFFF" />
          </View>
        }
      />

      {/* Live caption of the current/most recent utterance (teacher or
          learner) — hidden when the learner has turned captions off. */}
      {captionsEnabled && <LiveCaptionBar state={captionState} dimmed={hasDisplayCard} />}
    </View>
  );
}

// ─── Pre-call / connecting / error / ended stage ───────────────────────────────

function PreCallStage({
  status,
  errorMessage,
  lessonLabel,
  avatarUrl,
  userName,
  onStart,
  onBack,
}: {
  status: AudioLessonCallStatus;
  errorMessage?: string;
  lessonLabel: string;
  avatarUrl?: string | null;
  userName: string;
  onStart: () => void;
  onBack: () => void;
}) {
  const busy = status === "connecting" || status === "joining";

  return (
    <View className="mx-5 mt-3 h-[420px] rounded-3xl overflow-hidden bg-[#EADFC8]">
      <Image source={images.palace} className="absolute w-full h-full" resizeMode="cover" />
      <Image
        source={images.mascotWelcome}
        className="absolute bottom-0 self-center w-[240px] h-[280px]"
        resizeMode="contain"
      />

      <View className="absolute top-3 left-3 gap-1.5 max-w-[60%]">
        <View className="bg-[#1A1A1A]/60 rounded-full px-3 py-1.5 self-start">
          <Text className="font-poppins-semibold text-[11px] text-[#FFFFFF]" numberOfLines={1}>
            {lessonLabel}
          </Text>
        </View>
      </View>

      <LearnerTile avatarUrl={avatarUrl} userName={userName} />

      <View className="absolute bottom-4 left-4 right-4 bg-[#FFFFFF] rounded-2xl px-4 py-4 gap-3">
        {status === "error" ? (
          <>
            <View className="flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={20} color={C.endRed} />
              <Text className="flex-1 font-poppins-bold text-[15px] text-[#1A1A1A]">
                Couldn&rsquo;t connect
              </Text>
            </View>
            <Text className="font-poppins-regular text-[12px] leading-[18px] text-[#6B7280]">
              {errorMessage ?? "Something went wrong reaching your AI teacher."}
            </Text>
            <Pressable onPress={onStart} className="bg-[#1B6B3A] rounded-full py-3 items-center">
              <Text className="font-poppins-semibold text-[#FFFFFF] text-[14px]">Try again</Text>
            </Pressable>
          </>
        ) : status === "ended" ? (
          <>
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={20} color={C.green} />
              <Text className="flex-1 font-poppins-bold text-[15px] text-[#1A1A1A]">
                Session ended
              </Text>
            </View>
            <Text className="font-poppins-regular text-[12px] leading-[18px] text-[#6B7280]">
              Nice work! Your progress for this lesson is below.
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={onStart}
                className="flex-1 bg-[#E8F5EE] rounded-full py-3 items-center"
              >
                <Text className="font-poppins-semibold text-[#1B6B3A] text-[14px]">
                  Restart lesson
                </Text>
              </Pressable>
              <Pressable
                onPress={onBack}
                className="flex-1 bg-[#1B6B3A] rounded-full py-3 items-center"
              >
                <Text className="font-poppins-semibold text-[#FFFFFF] text-[14px]">
                  Back to lessons
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text className="font-poppins-bold text-[16px] text-[#1A1A1A]">
              {busy
                ? status === "connecting"
                  ? "Connecting…"
                  : "Joining call…"
                : "Ready when you are"}
            </Text>
            <Text className="font-poppins-regular text-[12px] leading-[18px] text-[#6B7280]">
              {busy
                ? "Setting up your audio session with the AI teacher."
                : "Start an audio-only session — your teacher will guide you through this lesson out loud."}
            </Text>
            <Pressable
              onPress={onStart}
              disabled={busy}
              className={`rounded-full py-3.5 items-center flex-row justify-center gap-2 ${
                busy ? "bg-[#9CA3AF]" : "bg-[#1B6B3A]"
              }`}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="mic" size={18} color="#FFFFFF" />
              )}
              <Text className="font-poppins-semibold text-[#FFFFFF] text-[15px]">
                {busy ? "Please wait" : "Start lesson call"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Mic / interrupt button (the one prominent call control) ──────────────
// Model: the mic is live by default (natural voice barge-in keeps working
// unchanged). A tap sends an explicit "interrupt the teacher" signal and
// shows a brief listening acknowledgment; a long-press toggles real
// mute/unmute for noisy environments.

type MicButtonVisualState = "live" | "listening" | "muted" | "interruptFailed";

function micButtonMeta(state: MicButtonVisualState) {
  switch (state) {
    case "muted":
      return { icon: "mic-off" as const, bg: C.muted, label: "Muted" };
    case "listening":
      return { icon: "ear" as const, bg: C.info, label: "Listening…" };
    case "interruptFailed":
      return { icon: "alert-circle" as const, bg: C.endRed, label: "Couldn't reach teacher" };
    default:
      return { icon: "mic" as const, bg: C.green, label: "Mic live" };
  }
}

function MicInterruptButton({
  micOn,
  onInterrupt,
  onToggleMute,
}: {
  micOn: boolean;
  /**
   * Explicit tap-to-interrupt the teacher while they're speaking. Resolves
   * once the interrupt event has actually been sent — the button only shows
   * "Listening…" once this resolves, and a distinct failure state if it
   * rejects, instead of acknowledging a tap that never reached the teacher.
   */
  onInterrupt: () => Promise<void>;
  /** Long-press: toggle actual mute/unmute. */
  onToggleMute: () => void;
}) {
  const [ackState, setAckState] = useState<"idle" | "listening" | "failed">("idle");
  const ackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
    };
  }, []);

  const handlePress = () => {
    if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
    onInterrupt()
      .then(() => {
        setAckState("listening");
        ackTimeoutRef.current = setTimeout(() => setAckState("idle"), 1500);
      })
      .catch((err) => {
        console.error("Failed to send student_interrupt event", err);
        setAckState("failed");
        ackTimeoutRef.current = setTimeout(() => setAckState("idle"), 1500);
      });
  };

  // Pressable's onPress is automatically suppressed after onLongPress fires
  // (see Pressability.js's isPressCanceledByLongPress), so a long-press
  // never also triggers an interrupt tap.
  const visualState: MicButtonVisualState = !micOn
    ? "muted"
    : ackState === "listening"
      ? "listening"
      : ackState === "failed"
        ? "interruptFailed"
        : "live";
  const meta = micButtonMeta(visualState);

  return (
    <View className="items-center gap-2">
      <Pressable
        onPress={handlePress}
        onLongPress={onToggleMute}
        delayLongPress={450}
        className="w-20 h-20 rounded-full items-center justify-center shadow-md"
        style={{ backgroundColor: meta.bg }}
      >
        <Ionicons name={meta.icon} size={34} color="#FFFFFF" />
      </Pressable>
      <Text className="font-poppins-semibold text-[13px] text-[#1A1A1A]">{meta.label}</Text>
      <Text className="font-poppins-regular text-[11px] text-[#6B7280]">
        Tap to interrupt · Hold to mute
      </Text>
    </View>
  );
}

// ─── Ajami display card (AI teacher's on-screen display tool) ─────────────────
// Rendered when the teacher calls its `display_on_screen` tool (see
// vision-agent/agent.py) and the app receives a Stream custom call event of
// type "ajami_display" (call.on("custom", ...)). A new event always replaces
// whatever card is currently shown.

interface AjamiDisplayPayload {
  type: "ajami_display";
  latin: string;
  ajami: string;
  note?: string;
}

function isAjamiDisplayPayload(data: unknown): data is AjamiDisplayPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return d.type === "ajami_display" && typeof d.latin === "string" && typeof d.ajami === "string";
}

function AjamiDisplayCard({
  payload,
  onDismiss,
}: {
  payload: AjamiDisplayPayload;
  onDismiss: () => void;
}) {
  return (
    <View className="mx-5 mt-3 bg-[#FFFFFF] rounded-2xl border border-[#EDE8E0] px-5 py-4 gap-1.5">
      <View className="flex-row items-start justify-between gap-2">
        {/*
         * v1 trusts the Ajami spelling the model provides in the tool call.
         * TODO: once the lessonId is threaded through to this event, resolve
         * against the lesson's canonical vocabulary
         * (lesson.activities[].vocabulary.ajami) instead of the model's own
         * spelling, falling back to the model's text only when no vocabulary
         * match exists.
         */}
        <AjamiText arabic variant="h2" style={{ flex: 1 }}>
          {payload.ajami}
        </AjamiText>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          className="w-8 h-8 items-center justify-center -mt-1 -mr-1"
        >
          <Ionicons name="close" size={20} color={C.muted} />
        </Pressable>
      </View>
      <AjamiText variant="h4" color={C.text}>
        {payload.latin}
      </AjamiText>
      {payload.note ? (
        <AjamiText variant="bodySm" color={C.textSub}>
          {payload.note}
        </AjamiText>
      ) : null}
    </View>
  );
}

// ─── Teacher unavailable banner ────────────────────────────────────────────────
// Shown when the AI teacher never joins the call (agent-start failure
// reported by the server, or the join timeout elapsed).

function TeacherUnavailableBanner() {
  return (
    <View className="mx-5 mt-3 bg-[#FFFFFF] rounded-2xl border border-[#EDE8E0] px-5 py-4 gap-1.5">
      <View className="flex-row items-center gap-2">
        <Ionicons name="alert-circle" size={18} color={C.endRed} />
        <Text className="font-poppins-bold text-[15px] text-[#1A1A1A]">Teacher unavailable</Text>
      </View>
      <Text className="font-poppins-regular text-[13px] leading-[19px] text-[#6B7280]">
        Your AI teacher couldn&rsquo;t join this session. You can keep practicing on your own, or
        end the call and try again in a moment.
      </Text>
    </View>
  );
}

// ─── Live call body (mounted inside <StreamCall> once joined) ─────────────────
// The only place that reads reactive Stream call state (mic status) — the
// hook that owns the `Call` instance stays outside React's provider tree.

function LiveLessonBody({
  lessonLabel,
  avatarUrl,
  userName,
  teacherJoinFailed,
  onToggleMic,
}: {
  lessonLabel: string;
  avatarUrl?: string | null;
  userName: string;
  /** The server-side agent-start request failed — skip straight to "not-available". */
  teacherJoinFailed: boolean;
  onToggleMic: () => void;
}) {
  const { useMicrophoneState } = useCallStateHooks();
  const { status: micStatus } = useMicrophoneState();
  const micOn = micStatus === "enabled";

  // Session clock — starts once the call is actually joined.
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const call = useCall();

  // AI teacher's on-screen display tool — a new event always replaces
  // whatever is currently shown. Live captions share the same custom-event
  // channel (see CAPTION_EVENT_TYPE in vision-agent/agent.py) with a
  // different `type`, so both are handled in this one subscription.
  const [displayPayload, setDisplayPayload] = useState<AjamiDisplayPayload | null>(null);
  const [captionState, dispatchCaption] = useReducer(reduceCaptionEvent, INITIAL_CAPTION_STATE);
  const captionsEnabled = useCaptionsStore((s) => s.captionsEnabled);
  const toggleCaptions = useCaptionsStore((s) => s.toggleCaptions);
  useEffect(() => {
    if (!call) return;
    return call.on("custom", (event) => {
      if (isAjamiDisplayPayload(event.custom)) {
        setDisplayPayload(event.custom);
      } else if (isCaptionPayload(event.custom)) {
        dispatchCaption(event.custom);
      }
    });
  }, [call]);

  // Teacher connection status: "joining" until the agent participant
  // (TEACHER_USER_ID) shows up in the call, "joined" once it does, or
  // "not-available" if the server already reported an agent-start failure
  // or the join timeout elapses first.
  const { useRemoteParticipants } = useCallStateHooks();
  const remoteParticipants = useRemoteParticipants();
  const teacherPresent = remoteParticipants.some((p) => p.userId === TEACHER_USER_ID);

  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (teacherPresent || teacherJoinFailed) return;
    const timer = setTimeout(() => setTimedOut(true), TEACHER_JOIN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [teacherPresent, teacherJoinFailed]);

  const teacherStatus: TeacherStatus = teacherPresent
    ? "joined"
    : teacherJoinFailed || timedOut
      ? "not-available"
      : "joining";

  // Explicit "interrupt the teacher" tap: sends a Stream custom call event
  // the vision-agent picks up to trigger the same interrupt path it already
  // uses for natural voice barge-in (see student_interrupt handling in
  // vision-agent/agent.py). Natural barge-in via the live mic keeps working
  // unchanged — this is only the explicit, deliberate version of it.
  // Returns the send promise (rather than swallowing it) so the button can
  // gate its "Listening…" acknowledgment on actual delivery.
  const handleInterrupt = (): Promise<void> => {
    if (!call) return Promise.reject(new Error("No active call to interrupt"));
    return call.sendCustomEvent({ type: STUDENT_INTERRUPT_EVENT_TYPE }).then(() => undefined);
  };

  return (
    <>
      <TeacherStage
        lessonLabel={lessonLabel}
        elapsed={formatElapsed(seconds)}
        micOn={micOn}
        avatarUrl={avatarUrl}
        userName={userName}
        teacherStatus={teacherStatus}
        captionState={captionState}
        captionsEnabled={captionsEnabled}
        onToggleCaptions={toggleCaptions}
        hasDisplayCard={displayPayload !== null}
      />

      {displayPayload && (
        <AjamiDisplayCard
          payload={displayPayload}
          onDismiss={() => setDisplayPayload(null)}
        />
      )}

      {teacherStatus === "not-available" && <TeacherUnavailableBanner />}

      <View className="items-center mt-5 px-5">
        <MicInterruptButton
          micOn={micOn}
          onInterrupt={handleInterrupt}
          onToggleMute={onToggleMic}
        />
      </View>
    </>
  );
}

// ─── Lesson info card ──────────────────────────────────────────────────────────
// Surfaces the raw lesson data driving the session: language, goal, phrases,
// and the context the AI teacher follows.

function LessonInfoCard({
  languageName,
  lesson,
  phrases,
}: {
  languageName: string;
  lesson: Lesson;
  phrases: Vocabulary[];
}) {
  return (
    <View className="mx-5 mt-5 bg-[#FFFFFF] rounded-2xl border border-[#EDE8E0] p-4 gap-3">
      {/* Language + title */}
      <View className="flex-row items-center gap-2">
        <View className="bg-[#E8F5EE] rounded-full px-3 py-1">
          <Text className="font-poppins-semibold text-[12px] text-[#1B6B3A]">{languageName}</Text>
        </View>
        <Text className="flex-1 font-poppins-bold text-[15px] text-[#1A1A1A]" numberOfLines={1}>
          {lesson.title}
        </Text>
      </View>

      {/* Goals */}
      <View className="gap-1.5">
        {lesson.goals.map((goal) => (
          <View key={goal} className="flex-row items-start gap-2">
            <Ionicons name="checkmark-circle" size={16} color={C.gold} style={{ marginTop: 2 }} />
            <Text className="flex-1 font-poppins-regular text-[13px] leading-[20px] text-[#6B7280]">
              {goal}
            </Text>
          </View>
        ))}
      </View>

      {/* Phrases practiced in this session */}
      {phrases.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {phrases.map((p) => (
            <View
              key={p.id}
              className="flex-row items-center gap-1.5 bg-[#FDF6E3] rounded-full px-3 py-1.5"
            >
              <Text className="font-noto-arabic text-[15px] text-[#1A1A1A]">{p.ajami}</Text>
              <Text className="font-poppins-semibold text-[12px] text-[#8A6D3B]">
                {p.transliteration}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* AI teacher context for this lesson */}
      <View className="bg-[#FAF6F0] rounded-xl p-3 flex-row gap-2">
        <Ionicons name="sparkles" size={14} color={C.gold} style={{ marginTop: 2 }} />
        <Text className="flex-1 font-poppins-regular text-[12px] leading-[18px] text-[#6B7280]">
          {lesson.aiTeacherPrompt}
        </Text>
      </View>
    </View>
  );
}

// ─── Session summary (shown only after a session actually ends) ───────────────
// Every number here is real and comes from useProgressStore — the XP the
// learner just earned, their live streak, and their progress toward today's
// goal.

function SessionSummaryCard({
  xpEarned,
  xpToday,
  dailyGoal,
  streakDays,
}: {
  xpEarned: number;
  xpToday: number;
  dailyGoal: number;
  streakDays: number;
}) {
  const goalPct = dailyGoal > 0 ? Math.min(xpToday / dailyGoal, 1) : 0;

  return (
    <View className="mx-5 mt-5 bg-[#FFFCF5] rounded-2xl border border-[#EDE8E0] px-5 py-5 gap-4">
      <View className="flex-row items-center justify-center gap-2">
        <Ionicons name="sparkles" size={14} color={C.gold} />
        <Text className="font-poppins-semibold text-[15px] text-[#1A1A1A]">
          Lesson complete
        </Text>
        <Ionicons name="sparkles" size={14} color={C.gold} />
      </View>

      <View className="flex-row">
        <View className="flex-1 items-center gap-1">
          <Text className="font-poppins-bold text-[24px] text-[#1B6B3A]">+{xpEarned}</Text>
          <Text className="font-poppins-regular text-[12px] text-[#6B7280]">XP earned</Text>
        </View>
        <View className="flex-1 items-center gap-1 border-l border-[#EDE8E0]">
          <Text className="font-poppins-bold text-[24px] text-[#D4A017]">{streakDays}</Text>
          <Text className="font-poppins-regular text-[12px] text-[#6B7280]">
            {streakDays === 1 ? "Day streak" : "Days streak"}
          </Text>
        </View>
      </View>

      <View className="gap-1.5">
        <View className="flex-row justify-between">
          <Text className="font-poppins-medium text-[12px] text-[#6B7280]">Today&rsquo;s goal</Text>
          <Text className="font-poppins-semibold text-[12px] text-[#1A1A1A]">
            {xpToday} / {dailyGoal} XP
          </Text>
        </View>
        <ProgressBar progress={goalPct} variant="emerald" height={6} />
      </View>
    </View>
  );
}

// ─── Skill scoring preview ────────────────────────────────────────────────────
// Deliberately shows no scores. The AI teacher doesn't assess the learner
// yet, and a placeholder rating would be indistinguishable from a real one.

function SkillsPreviewCard() {
  return (
    <View className="mx-5 mt-5 bg-[#FFFFFF] rounded-2xl border border-[#EDE8E0] px-2 py-5">
      <View className="flex-row items-center justify-center gap-2 mb-1">
        <Text className="font-poppins-semibold text-[15px] text-[#1A1A1A]">
          Skill feedback
        </Text>
        <View className="bg-[#FDF6E3] rounded-full px-2 py-0.5">
          <Text className="font-poppins-semibold text-[10px] text-[#8A6D3B]">Coming soon</Text>
        </View>
      </View>
      <Text className="font-poppins-regular text-[12px] text-[#6B7280] text-center mb-4 px-4">
        Your teacher will score these areas after each session.
      </Text>

      <View className="flex-row">
        {SKILL_AREAS.map((item, i) => (
          <View
            key={item.id}
            className={`flex-1 items-center gap-1.5 px-3 ${
              i > 0 ? "border-l border-[#EDE8E0]" : ""
            }`}
          >
            <View className="w-12 h-12 rounded-full items-center justify-center bg-[#F1EAE0]">
              <Ionicons name={item.icon} size={20} color={C.muted} />
            </View>
            <Text className="font-poppins-medium text-[13px] text-[#6B7280]">{item.label}</Text>
            <Text className="font-poppins-regular text-[13px] text-[#9CA3AF]">—</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function AudioLessonScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { lessonId } = useLocalSearchParams<{ lessonId?: string }>();

  const lesson = LESSONS.find((l) => l.id === lessonId);
  const unit = UNITS.find((u) => u.id === lesson?.unitId);
  const language = LANGUAGES.find((l) => l.id === unit?.languageId);

  // Phrases = vocabulary embedded in this lesson's activities
  const phrases = useMemo(
    () =>
      (lesson?.activities ?? [])
        .map((a) => a.vocabulary)
        .filter((v): v is Vocabulary => v !== undefined),
    [lesson]
  );

  const userName = user?.fullName || user?.username || "You";

  const callSession = useAudioLessonCall({
    lessonId: lesson?.id ?? "",
    languageId: language?.id ?? "",
    lessonTitle: lesson?.title ?? "",
    userName,
    userImage: user?.imageUrl,
  });

  // ── Get the teacher moving before the learner taps start ──────────────────
  // The pre-call screen is a few seconds of reading time; spending it
  // reserving the call and bringing the teacher in means "Start lesson call"
  // only has to do the local join. See prewarm() in useAudioLessonCall.
  const { prewarm } = callSession;
  useEffect(() => {
    if (lesson && language) prewarm();
  }, [lesson, language, prewarm]);

  // ── Award progress once the session actually ends ─────────────────────────
  // "ended" is only reachable via the End call button, which is itself only
  // rendered once the call is live — so this can't fire for a session the
  // learner never joined.
  const completeLesson = useProgressStore((s) => s.completeLesson);
  const xpToday = useProgressStore(selectXpToday);
  const streakDays = useProgressStore(selectStreakDays);
  const dailyGoal = useProgressStore((s) => s.dailyGoal);

  // Guards against re-awarding on every re-render while status stays
  // "ended". Cleared when a new call goes live so restarting the lesson
  // earns its XP again — repeat practice is still practice.
  const awardedRef = useRef(false);
  useEffect(() => {
    if (!lesson) return;
    if (callSession.status === "joined") {
      awardedRef.current = false;
    } else if (callSession.status === "ended" && !awardedRef.current) {
      awardedRef.current = true;
      completeLesson(lesson.id);
    }
  }, [callSession.status, lesson, completeLesson]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(home)/learn");
  };

  // Empty state: opened without a valid lesson id
  if (!lesson || !language) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View className="flex-1 items-center justify-center p-6 gap-4">
          <View className="w-20 h-20 rounded-full bg-[#E8F5EE] items-center justify-center">
            <Ionicons name="headset" size={36} color={C.green} />
          </View>
          <Text className="font-poppins-bold text-2xl text-[#1A1A1A]">Lesson not found</Text>
          <Text className="font-poppins-regular text-[15px] text-[#6B7280] text-center leading-[22px] max-w-[260px]">
            Pick a lesson from the Learn tab to start an audio session with your AI teacher.
          </Text>
          <Pressable onPress={goBack} className="bg-[#1B6B3A] rounded-full px-6 py-3 mt-2">
            <Text className="font-poppins-semibold text-[#FFFFFF] text-[15px]">Go to lessons</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const lessonLabel = `${language.name} · ${lesson.title}`;
  const isLive = callSession.status === "joined" && callSession.client && callSession.call;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <SessionHeader
          onBack={goBack}
          status={callSession.status}
          isLive={!!isLive}
          onEndCall={callSession.endCall}
        />

        {isLive ? (
          <StreamVideo client={callSession.client!}>
            <StreamCall call={callSession.call!}>
              <LiveLessonBody
                lessonLabel={lessonLabel}
                avatarUrl={user?.imageUrl}
                userName={userName}
                teacherJoinFailed={callSession.teacherJoinFailed}
                onToggleMic={callSession.toggleMic}
              />
            </StreamCall>
          </StreamVideo>
        ) : (
          <PreCallStage
            status={callSession.status}
            errorMessage={callSession.errorMessage}
            lessonLabel={lessonLabel}
            avatarUrl={user?.imageUrl}
            userName={userName}
            onStart={callSession.start}
            onBack={goBack}
          />
        )}

        {/* Only after a real session — previously this rendered immediately,
            so the learner saw scores for a lesson they hadn't started. */}
        {callSession.status === "ended" && (
          <>
            <SessionSummaryCard
              xpEarned={XP_PER_LESSON}
              xpToday={xpToday}
              dailyGoal={dailyGoal}
              streakDays={streakDays}
            />
            <SkillsPreviewCard />
          </>
        )}

        <LessonInfoCard languageName={language.name} lesson={lesson} phrases={phrases} />
      </ScrollView>
    </SafeAreaView>
  );
}
