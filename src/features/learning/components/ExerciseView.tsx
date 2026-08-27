/**
 * src/features/learning/components/ExerciseView.tsx
 *
 * Renders one exercise and collects the learner's answer.
 *
 * It switches on the RESPONSE kind, not the exercise type — the same split
 * that keeps grading to four cases keeps the UI to three input widgets. A new
 * pedagogical exercise type needs no new component here as long as it is
 * answered in one of the established ways.
 *
 * This component owns no grading and no scoring. It reports the answer
 * upward and renders whatever verdict it is given back, so the screen stays
 * the single place where lesson state lives.
 */

import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

import type { Exercise } from "@/types/content";
import type { LearnerAnswer } from "@/features/learning/grading";

import { AudioButton } from "./AudioButton";

const C = {
  surface: "#FFFFFF",
  green: "#1B6B3A",
  greenLight: "#E8F5EE",
  gold: "#D4A017",
  red: "#C0392B",
  redLight: "#FCEDEA",
  text: "#1A1A1A",
  textSub: "#6B7280",
  border: "#EDE8E0",
};

/** What the screen has decided about the current answer, if anything. */
export type Verdict = { correct: boolean; expected?: string } | null;

export interface ExerciseViewProps {
  exercise: Exercise;
  /** The pending answer, owned by the screen so it survives re-renders. */
  answer: LearnerAnswer | null;
  onAnswerChange: (answer: LearnerAnswer) => void;
  /** Set once the answer is submitted; inputs lock and feedback shows. */
  verdict: Verdict;
}

// ─── Stem ─────────────────────────────────────────────────────────────────────

/**
 * The thing being asked about: the Ajami glyph or word, and its clip.
 *
 * Ajami is rendered large and centred because these are letterforms a beginner
 * is being asked to tell apart — at body-text size the dots that distinguish
 * ba, ta and tha are close to invisible.
 */
function Stem({ exercise }: { exercise: Exercise }) {
  const { stem } = exercise;
  if (!stem) return null;

  const hasAudio = stem.audio !== undefined;
  const isListening = exercise.type === "listening";

  return (
    <View className="items-center gap-3 py-2">
      {/* A listening exercise hides its text: showing the word defeats the
          exercise, which is to recognise it by ear. */}
      {stem.text && !isListening && (
        <Text
          className="font-poppins-bold text-[#1A1A1A] text-center"
          style={{ fontSize: 56, lineHeight: 84 }}
        >
          {stem.text}
        </Text>
      )}

      {stem.transliteration && !isListening && (
        <Text className="font-poppins-medium text-base text-[#6B7280]">
          {stem.transliteration}
        </Text>
      )}

      {(hasAudio || isListening) && (
        <AudioButton audio={stem.audio} size="lg" label="Play the audio" />
      )}
    </View>
  );
}

// ─── Choice ───────────────────────────────────────────────────────────────────

function ChoiceInput({
  exercise,
  answer,
  onAnswerChange,
  verdict,
}: ExerciseViewProps) {
  if (exercise.response.kind !== "choice") return null;
  const { options, correctOptionId } = exercise.response;

  const selectedId = answer?.kind === "choice" ? answer.optionId : null;
  const locked = verdict !== null;

  // Longer labels need one option per row; short glyphs read better as a grid.
  const isGlyphGrid = options.every((o) => (o.label?.length ?? 0) <= 4);

  return (
    <View
      className={isGlyphGrid ? "flex-row flex-wrap justify-center gap-3" : "gap-3"}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        const isCorrectOption = option.id === correctOptionId;

        // After submitting, the right answer is always marked — including
        // when the learner missed it, since being told only "wrong" teaches
        // nothing.
        let borderColor = C.border;
        let backgroundColor = C.surface;
        if (locked && isCorrectOption) {
          borderColor = C.green;
          backgroundColor = C.greenLight;
        } else if (locked && isSelected) {
          borderColor = C.red;
          backgroundColor = C.redLight;
        } else if (isSelected) {
          borderColor = C.green;
          backgroundColor = C.greenLight;
        }

        return (
          <Pressable
            key={option.id}
            disabled={locked}
            onPress={() =>
              onAnswerChange({ kind: "choice", optionId: option.id })
            }
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: locked }}
            accessibilityLabel={option.label ?? "Audio option"}
            style={{
              borderWidth: 2,
              borderColor,
              backgroundColor,
              borderRadius: 16,
              paddingVertical: isGlyphGrid ? 20 : 16,
              paddingHorizontal: 20,
              minWidth: isGlyphGrid ? 96 : undefined,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 10,
            }}
          >
            {option.audio && <AudioButton audio={option.audio} size="sm" />}
            {option.label && (
              <Text
                className="font-poppins-semibold text-[#1A1A1A] text-center"
                style={{
                  fontSize: isGlyphGrid ? 34 : 17,
                  lineHeight: isGlyphGrid ? 50 : 26,
                }}
              >
                {option.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Text ─────────────────────────────────────────────────────────────────────

function TextAnswerInput({
  exercise,
  answer,
  onAnswerChange,
  verdict,
}: ExerciseViewProps) {
  if (exercise.response.kind !== "text") return null;

  const value = answer?.kind === "text" ? answer.value : "";
  const locked = verdict !== null;

  return (
    <View className="gap-2">
      <TextInput
        value={value}
        onChangeText={(text) => onAnswerChange({ kind: "text", value: text })}
        editable={!locked}
        placeholder="Type your answer"
        placeholderTextColor={C.textSub}
        // The answer is a word in a language being learned, so the keyboard's
        // guesses are drawn from the wrong vocabulary and its autocorrect
        // would silently rewrite a correct answer into a wrong one.
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        accessibilityLabel="Your answer"
        style={{
          borderWidth: 2,
          borderColor: locked
            ? verdict?.correct
              ? C.green
              : C.red
            : C.border,
          backgroundColor: C.surface,
          borderRadius: 16,
          paddingHorizontal: 18,
          paddingVertical: 16,
          fontSize: 18,
          color: C.text,
        }}
      />
    </View>
  );
}

// ─── Self-assessed ────────────────────────────────────────────────────────────

/**
 * Listen-and-repeat. There is no recogniser and no recording: the learner
 * hears or reads the target, says it, and confirms. Honest about what it can
 * measure rather than pretending to score speech.
 */
function SelfAssessedInput({
  answer,
  onAnswerChange,
  verdict,
}: ExerciseViewProps) {
  const confirmed = answer?.kind === "self-assessed";
  const locked = verdict !== null;

  return (
    <Pressable
      disabled={locked}
      onPress={() => onAnswerChange({ kind: "self-assessed" })}
      accessibilityRole="button"
      accessibilityState={{ selected: confirmed, disabled: locked }}
      style={{
        borderWidth: 2,
        borderColor: confirmed ? C.green : C.border,
        backgroundColor: confirmed ? C.greenLight : C.surface,
        borderRadius: 16,
        padding: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Ionicons
        name={confirmed ? "checkmark-circle" : "mic-outline"}
        size={26}
        color={confirmed ? C.green : C.textSub}
      />
      <View className="flex-1">
        <Text className="font-poppins-semibold text-base text-[#1A1A1A]">
          I said it out loud
        </Text>
        <Text className="font-poppins-regular text-[13px] text-[#6B7280]">
          Practice counts — this one is yours to judge.
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export function FeedbackBanner({ verdict }: { verdict: Verdict }) {
  if (!verdict) return null;

  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl p-4"
      style={{ backgroundColor: verdict.correct ? C.greenLight : C.redLight }}
    >
      <Ionicons
        name={verdict.correct ? "checkmark-circle" : "close-circle"}
        size={28}
        color={verdict.correct ? C.green : C.red}
      />
      <View className="flex-1">
        <Text
          className="font-poppins-bold text-base"
          style={{ color: verdict.correct ? C.green : C.red }}
        >
          {verdict.correct ? "Correct" : "Not quite"}
        </Text>
        {!verdict.correct && verdict.expected && (
          <Text className="font-poppins-regular text-sm text-[#1A1A1A]">
            Answer: {verdict.expected}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function ExerciseView(props: ExerciseViewProps) {
  const { exercise } = props;

  return (
    <View className="gap-6">
      <Text className="font-poppins-semibold text-xl text-[#1A1A1A] text-center leading-7">
        {exercise.prompt}
      </Text>

      <Stem exercise={exercise} />

      {exercise.response.kind === "choice" && <ChoiceInput {...props} />}
      {exercise.response.kind === "text" && <TextAnswerInput {...props} />}
      {exercise.response.kind === "self-assessed" && (
        <SelfAssessedInput {...props} />
      )}

      {exercise.hint && props.verdict === null && (
        <Text className="font-poppins-regular text-[13px] text-[#6B7280] text-center">
          Hint: {exercise.hint}
        </Text>
      )}
    </View>
  );
}
