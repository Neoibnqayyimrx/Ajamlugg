/**
 * app/(home)/lesson.tsx
 *
 * The lesson player — the screen that makes the app usable without AI.
 *
 * Before this existed, `activities[]` was rendered by nothing: tapping a lesson
 * in Learn opened the Gemini audio session, so the AI was not merely ON the
 * learner's critical path, it WAS the path. This screen replaces it. It
 * fetches a lesson document, walks its exercises, grades each answer with the
 * pure functions in src/features/learning, awards XP, and records completion.
 *
 * Nothing here touches the network:
 *   - content comes from the repository (bundled snapshot today, cache in Phase 4)
 *   - grading is a pure function over the document
 *   - XP is computed on-device and written to the local store
 *
 * That is the acceptance test — fresh install, no AI env vars, vision-agent
 * down, Lesson 1 completable end to end — expressed as a screen.
 *
 * ─── One attempt per exercise ────────────────────────────────────────────────
 * A wrong answer reveals the right one and moves on; there is no retry loop.
 * It keeps the attempt log unambiguous (one submission per position) and
 * matches how the genre generally works. `computeLessonScore` already
 * distinguishes first-try correctness, so adding retries later is a change to
 * this screen alone.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ExerciseView,
  FeedbackBanner,
  type Verdict,
} from "@/features/learning/components/ExerciseView";
import { getLessonDocument } from "@/features/content/repository";
import {
  expandLessonSequence,
  gradeExercise,
  isSelfAssessed,
  type LearnerAnswer,
  type SequenceItem,
} from "@/features/learning/grading";
import { computeLessonScore, type Attempt } from "@/features/learning/scoring";
import { useProgressStore } from "@/store/useProgressStore";
import type { LessonDocument } from "@/types/content";

const C = {
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  green: "#1B6B3A",
  greenLight: "#E8F5EE",
  gold: "#D4A017",
  text: "#1A1A1A",
  textSub: "#6B7280",
  border: "#EDE8E0",
  track: "#EADFC8",
};

// ─── Chrome ───────────────────────────────────────────────────────────────────

function PlayerHeader({
  progress,
  position,
  total,
  onClose,
}: {
  progress: number;
  position: number;
  total: number;
  onClose: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 px-5 pt-2 pb-3">
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close lesson"
        className="w-10 h-10 items-center justify-center -ml-2.5"
      >
        <Ionicons name="close" size={26} color={C.textSub} />
      </Pressable>

      <View
        className="flex-1 h-3 rounded-full overflow-hidden"
        style={{ backgroundColor: C.track }}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: position }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: "100%",
            backgroundColor: C.green,
            borderRadius: 999,
          }}
        />
      </View>

      <Text className="font-poppins-semibold text-[13px] text-[#6B7280]">
        {position} / {total}
      </Text>
    </View>
  );
}

function CentredMessage({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center p-6 gap-4">
      <View className="w-20 h-20 rounded-full bg-[#E8F5EE] items-center justify-center">
        <Ionicons name={icon} size={36} color={C.green} />
      </View>
      <Text className="font-poppins-bold text-2xl text-[#1A1A1A] text-center">
        {title}
      </Text>
      <Text className="font-poppins-regular text-[15px] text-[#6B7280] text-center leading-[22px] max-w-[280px]">
        {body}
      </Text>
      <Pressable
        onPress={onAction}
        className="bg-[#1B6B3A] rounded-2xl px-8 py-4 mt-2"
      >
        <Text className="font-poppins-bold text-base text-white">
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="font-poppins-regular text-[15px] text-[#6B7280]">
        {label}
      </Text>
      <Text className="font-poppins-semibold text-[15px] text-[#1A1A1A]">
        {value}
      </Text>
    </View>
  );
}

function LessonSummary({
  document,
  score,
  onDone,
}: {
  document: LessonDocument;
  score: ReturnType<typeof computeLessonScore>;
  onDone: () => void;
}) {
  const { breakdown } = score;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center gap-3 pt-6">
        <View className="w-24 h-24 rounded-full bg-[#E8F5EE] items-center justify-center">
          <Ionicons
            name={score.perfect ? "trophy" : "checkmark-circle"}
            size={48}
            color={score.perfect ? C.gold : C.green}
          />
        </View>
        <Text className="font-poppins-bold text-[28px] text-[#1A1A1A] text-center">
          {score.perfect ? "Perfect!" : "Lesson complete"}
        </Text>
        <Text className="font-poppins-regular text-[15px] text-[#6B7280] text-center">
          {document.title}
        </Text>
      </View>

      <View className="items-center py-4 rounded-2xl bg-[#FDF6E3]">
        <Text className="font-poppins-bold text-[44px] text-[#D4A017]">
          +{score.xp}
        </Text>
        <Text className="font-poppins-semibold text-sm text-[#8A6D3B]">
          XP earned
        </Text>
      </View>

      <View className="bg-white rounded-2xl border border-[#EDE8E0] p-5 gap-3">
        <SummaryRow
          label="Correct first try"
          value={`${score.correctFirstTry} / ${score.total}`}
        />
        <SummaryRow
          label="Accuracy"
          value={`${Math.round(score.accuracy * 100)}%`}
        />
        <View className="h-px bg-[#EDE8E0] my-1" />
        <SummaryRow label="Lesson complete" value={`+${breakdown.completion}`} />
        <SummaryRow label="Exercises" value={`+${breakdown.exercises}`} />
        {breakdown.quizBonus > 0 && (
          <SummaryRow label="Quiz bonus" value={`+${breakdown.quizBonus}`} />
        )}
        {breakdown.perfectBonus > 0 && (
          <SummaryRow
            label="Perfect lesson"
            value={`+${breakdown.perfectBonus}`}
          />
        )}
      </View>

      <Pressable
        onPress={onDone}
        className="bg-[#1B6B3A] rounded-2xl py-4 items-center"
      >
        <Text className="font-poppins-bold text-base text-white">Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LessonScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId?: string }>();
  const completeLesson = useProgressStore((s) => s.completeLesson);

  const [document, setDocument] = useState<LessonDocument | null>(null);
  // The lesson whose fetch has settled. Deriving `loading` by comparing this
  // to the requested id avoids a setState in the effect body, which would
  // cost an extra render pass every time a lesson opens.
  const [loadedLessonId, setLoadedLessonId] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<LearnerAnswer | null>(null);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [finished, setFinished] = useState(false);

  const requestedLessonId = lessonId ?? "";

  useEffect(() => {
    let active = true;

    getLessonDocument(requestedLessonId)
      // A failed lookup resolves to null and falls through to the
      // "unavailable" screen. Without this the promise would reject and the
      // spinner would spin forever.
      .catch(() => null)
      .then((result) => {
        // Guard against a stale response for a lesson the learner has already
        // navigated away from overwriting the current one.
        if (!active) return;
        setDocument(result);
        setLoadedLessonId(requestedLessonId);
      });

    return () => {
      active = false;
    };
  }, [requestedLessonId]);

  const loading = loadedLessonId !== requestedLessonId;

  const sequence: SequenceItem[] = useMemo(
    () => (document ? expandLessonSequence(document) : []),
    [document]
  );

  const item = sequence[index];

  const handleSubmit = useCallback(() => {
    if (!item || !answer || verdict !== null) return;

    const result = gradeExercise(item.exercise, answer);
    setVerdict(result);
    setAttempts((previous) => [
      ...previous,
      {
        key: item.key,
        correctFirstTry: result.correct,
        selfAssessed: isSelfAssessed(item.exercise),
        isQuizItem: item.quizId !== undefined,
      },
    ]);
  }, [item, answer, verdict]);

  const handleContinue = useCallback(() => {
    setAnswer(null);
    setVerdict(null);
    if (index + 1 < sequence.length) {
      setIndex(index + 1);
    } else {
      setFinished(true);
    }
  }, [index, sequence.length]);

  const score = useMemo(() => computeLessonScore(attempts), [attempts]);

  // Recorded in an effect rather than in handleContinue so that completion is
  // written exactly once even if the summary re-renders.
  useEffect(() => {
    if (finished && document) {
      completeLesson(document.id, score.xp);
    }
    // score.xp is derived from `attempts`, which is frozen by the time
    // `finished` flips, so this cannot fire twice with different values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, document?.id]);

  const handleExit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(home)/learn");
  }, [router]);

  // ── Loading and error states ───────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={C.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!document || sequence.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <CentredMessage
          icon="book-outline"
          title="Lesson unavailable"
          body="We couldn't open this lesson. It may have been updated since you last synced."
          actionLabel="Back to lessons"
          onAction={handleExit}
        />
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <LessonSummary document={document} score={score} onDone={handleExit} />
      </SafeAreaView>
    );
  }

  // ── Player ─────────────────────────────────────────────────────────────────

  const canSubmit = answer !== null && verdict === null;
  const isLast = index + 1 >= sequence.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <PlayerHeader
        progress={index / sequence.length}
        position={index + 1}
        total={sequence.length}
        onClose={handleExit}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {item.quizId && (
          <View className="self-center flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDF6E3]">
            <Ionicons name="ribbon-outline" size={14} color={C.gold} />
            <Text className="font-poppins-semibold text-xs text-[#8A6D3B]">
              Quiz
            </Text>
          </View>
        )}

        {/* Keyed by position so switching exercises resets any internal
            state — without it, a typed answer would persist into the next
            text exercise. */}
        <ExerciseView
          key={item.key}
          exercise={item.exercise}
          answer={answer}
          onAnswerChange={setAnswer}
          verdict={verdict}
        />
      </ScrollView>

      <View
        className="px-5 pt-3 gap-3"
        style={{
          paddingBottom: 20,
          backgroundColor: C.surface,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <FeedbackBanner verdict={verdict} />

        <Pressable
          onPress={verdict === null ? handleSubmit : handleContinue}
          disabled={verdict === null && !canSubmit}
          accessibilityRole="button"
          className="rounded-2xl py-4 items-center"
          style={{
            backgroundColor:
              verdict === null && !canSubmit ? C.track : C.green,
          }}
        >
          <Text
            className="font-poppins-bold text-base"
            style={{
              color: verdict === null && !canSubmit ? C.textSub : "#FFFFFF",
            }}
          >
            {verdict === null ? "Check" : isLast ? "Finish" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
