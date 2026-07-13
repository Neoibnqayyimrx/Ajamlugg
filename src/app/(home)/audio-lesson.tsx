/**
 * app/(home)/audio-lesson.tsx
 *
 * AI Teacher — Audio Lesson screen (07-audio-lesson-screen design).
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
 * The "teacher" speaks through a script of lines built from that data.
 * Tapping the response bubble advances to the next line — a simple mock
 * of the real AI audio agent that arrives later (Stream Vision Agents).
 */

import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
  StreamCall,
  StreamVideo,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressBar } from "@/components/ui/progress-bar";
import images from "@/constants/images";
import { LANGUAGES } from "@/data/languages";
import { LESSONS } from "@/data/lessons";
import { UNITS } from "@/data/units";
import { AudioLessonCallStatus, useAudioLessonCall } from "@/hooks/useAudioLessonCall";
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
};

// ─── Mock session feedback ─────────────────────────────────────────────────────
// Real scores come from the AI agent later; these drive the design's
// "Your progress in this lesson" card for now.

const SESSION_FEEDBACK = [
  { id: "speaking", label: "Speaking", rating: "Excellent", icon: "megaphone" as const, variant: "emerald" as const, color: C.green, progress: 0.9 },
  { id: "pronunciation", label: "Pronunciation", rating: "Great", icon: "mic" as const, variant: "gold" as const, color: C.gold, progress: 0.65 },
  { id: "grammar", label: "Grammar", rating: "Good", icon: "book" as const, variant: "emerald" as const, color: C.green, progress: 0.75 },
];

// ─── Teacher script ────────────────────────────────────────────────────────────
// The lines the AI teacher "says" during the session, built from lesson data:
// a greeting, one line per phrase, then the closing praise from the design.

interface TeacherLine {
  headline: string;
  subtitle: string;
}

function buildTeacherScript(lesson: Lesson, phrases: Vocabulary[]): TeacherLine[] {
  const phraseLines: TeacherLine[] =
    phrases.length > 0
      ? phrases.map((p) => ({
          headline: `${p.transliteration} · ${p.ajami}`,
          subtitle: `${p.translation} — repeat after me! 🎙️`,
        }))
      : lesson.activities.map((a) => ({
          headline: a.prompt,
          subtitle: "Give it a try — say it out loud! 🎙️",
        }));

  return [
    {
      headline: "Salaam! 👋",
      subtitle: `Today's lesson: ${lesson.title}. ${lesson.goals[0]}.`,
    },
    ...phraseLines,
    { headline: "Madallah!", subtitle: "That was great! 👏" },
  ];
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

// ─── Header ────────────────────────────────────────────────────────────────────

function SessionHeader({
  onBack,
  status,
}: {
  onBack: () => void;
  status: AudioLessonCallStatus;
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
// the teacher, the learner's avatar tile, and the teacher response bubble.

function TeacherStage({
  lessonLabel,
  elapsed,
  micOn,
  avatarUrl,
  userName,
  line,
  subtitlesOn,
  onAdvance,
}: {
  lessonLabel: string;
  elapsed: string;
  micOn: boolean;
  avatarUrl?: string | null;
  userName: string;
  line: TeacherLine;
  subtitlesOn: boolean;
  onAdvance: () => void;
}) {
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

      {/* Teacher response bubble — tap to hear the next line */}
      <Pressable
        onPress={onAdvance}
        className="absolute bottom-4 left-4 right-4 bg-[#FFFFFF] rounded-2xl px-4 py-3.5 flex-row items-center gap-3 shadow-md"
      >
        <View className="w-9 h-9 rounded-full bg-[#FDF6E3] items-center justify-center">
          <Ionicons name="sparkles" size={18} color={C.gold} />
        </View>
        <View className="flex-1">
          <Text className="font-poppins-bold text-[17px] text-[#1A1A1A]" numberOfLines={1}>
            {line.headline}
          </Text>
          {subtitlesOn && (
            <Text className="font-poppins-regular text-[13px] text-[#6B7280]" numberOfLines={2}>
              {line.subtitle}
            </Text>
          )}
        </View>
        <Ionicons name="volume-high" size={24} color={C.green} />
      </Pressable>
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

// ─── Call controls ─────────────────────────────────────────────────────────────

function ControlButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  danger = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  /** Highlights the label green (e.g. subtitles on, mic live) */
  active?: boolean;
  /** Visual-only placeholder (camera in an audio-only session) */
  disabled?: boolean;
  danger?: boolean;
}) {
  const iconColor = danger ? "#FFFFFF" : disabled ? C.muted : C.green;
  return (
    <Pressable onPress={onPress} disabled={disabled} className="items-center gap-2 w-[76px]">
      <View
        className={`w-16 h-16 rounded-full items-center justify-center ${
          danger ? "bg-[#D95040]" : "bg-[#FFFFFF] border border-[#EDE8E0]"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>
      <Text
        className={`font-poppins-semibold text-[13px] ${
          active ? "text-[#1B6B3A]" : disabled ? "text-[#9CA3AF]" : "text-[#1A1A1A]"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Live call body (mounted inside <StreamCall> once joined) ─────────────────
// The only place that reads reactive Stream call state (mic status) — the
// hook that owns the `Call` instance stays outside React's provider tree.

function LiveLessonBody({
  lessonLabel,
  avatarUrl,
  userName,
  line,
  subtitlesOn,
  onAdvance,
  onToggleSubtitles,
  onToggleMic,
  onEndCall,
}: {
  lessonLabel: string;
  avatarUrl?: string | null;
  userName: string;
  line: TeacherLine;
  subtitlesOn: boolean;
  onAdvance: () => void;
  onToggleSubtitles: () => void;
  onToggleMic: () => void;
  onEndCall: () => void;
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

  return (
    <>
      <TeacherStage
        lessonLabel={lessonLabel}
        elapsed={formatElapsed(seconds)}
        micOn={micOn}
        avatarUrl={avatarUrl}
        userName={userName}
        line={line}
        subtitlesOn={subtitlesOn}
        onAdvance={onAdvance}
      />

      <View className="flex-row justify-center gap-2 mt-5 px-5">
        <ControlButton icon="videocam-off" label="Camera" disabled />
        <ControlButton
          icon={micOn ? "mic" : "mic-off"}
          label={micOn ? "Mic" : "Muted"}
          active={micOn}
          onPress={onToggleMic}
        />
        <ControlButton
          icon="chatbox-ellipses-outline"
          label="Subtitles"
          active={subtitlesOn}
          onPress={onToggleSubtitles}
        />
        <ControlButton icon="call" label="End Call" danger onPress={onEndCall} />
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

// ─── Session feedback card ─────────────────────────────────────────────────────

function SessionFeedbackCard() {
  return (
    <View className="mx-5 mt-5 bg-[#FFFCF5] rounded-2xl border border-[#EDE8E0] px-2 py-5">
      <View className="flex-row items-center justify-center gap-2 mb-4">
        <Ionicons name="sparkles" size={14} color={C.gold} />
        <Text className="font-poppins-semibold text-[15px] text-[#1A1A1A]">
          Your progress in this lesson
        </Text>
        <Ionicons name="sparkles" size={14} color={C.gold} />
      </View>

      <View className="flex-row">
        {SESSION_FEEDBACK.map((item, i) => (
          <View
            key={item.id}
            className={`flex-1 items-center gap-1.5 px-3 ${
              i > 0 ? "border-l border-[#EDE8E0]" : ""
            }`}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: item.color }}
            >
              <Ionicons name={item.icon} size={20} color="#FFFFFF" />
            </View>
            <Text className="font-poppins-medium text-[13px] text-[#1A1A1A]">{item.label}</Text>
            <Text className="font-poppins-bold text-[15px]" style={{ color: item.color }}>
              {item.rating}
            </Text>
            <ProgressBar progress={item.progress} variant={item.variant} height={6} />
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

  const script = useMemo(
    () => (lesson ? buildTeacherScript(lesson, phrases) : []),
    [lesson, phrases]
  );

  const [lineIndex, setLineIndex] = useState(0);
  const [subtitlesOn, setSubtitlesOn] = useState(true);

  const userName = user?.fullName || user?.username || "You";

  const callSession = useAudioLessonCall({
    lessonId: lesson?.id ?? "",
    languageId: language?.id ?? "",
    lessonTitle: lesson?.title ?? "",
    userName,
    userImage: user?.imageUrl,
  });

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

  // Loop back to the start after the closing line — lets learners replay
  const advanceLine = () => setLineIndex((i) => (i + 1) % script.length);

  const startCall = () => {
    setLineIndex(0);
    callSession.start();
  };

  const lessonLabel = `${language.name} · ${lesson.title}`;
  const isLive = callSession.status === "joined" && callSession.client && callSession.call;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <SessionHeader onBack={goBack} status={callSession.status} />

        {isLive ? (
          <StreamVideo client={callSession.client!}>
            <StreamCall call={callSession.call!}>
              <LiveLessonBody
                lessonLabel={lessonLabel}
                avatarUrl={user?.imageUrl}
                userName={userName}
                line={script[lineIndex]}
                subtitlesOn={subtitlesOn}
                onAdvance={advanceLine}
                onToggleSubtitles={() => setSubtitlesOn((v) => !v)}
                onToggleMic={callSession.toggleMic}
                onEndCall={callSession.endCall}
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
            onStart={startCall}
            onBack={goBack}
          />
        )}

        <SessionFeedbackCard />

        <LessonInfoCard languageName={language.name} lesson={lesson} phrases={phrases} />
      </ScrollView>
    </SafeAreaView>
  );
}
