/**
 * src/features/learning/grading.ts
 *
 * On-device grading. Pure functions over a lesson document and a learner's
 * answer — no I/O, no clock, no randomness, no network.
 *
 * This module is the load-bearing piece of the "AI is never a runtime
 * dependency" guarantee. If grading can be done here, a learner with a cached
 * lesson and no connectivity can finish it; if any answer had to be scored
 * remotely, every one of the offline requirements would collapse. Keeping
 * these functions pure is what makes that property testable rather than
 * aspirational.
 *
 * Grading dispatches on the RESPONSE kind, not the exercise type — see the
 * header of src/types/content.ts for why those are separate. There are four
 * response kinds and therefore four grading paths, no matter how many
 * pedagogical exercise types get added later.
 */

import type { Exercise, LessonDocument } from "@/types/content";

import { matchesAcceptedAnswer } from "./normalize";

/**
 * What the player hands back when the learner submits.
 *
 * `self-assessed` carries no payload: the learner tapping "I said it" IS the
 * answer. It is still an explicit variant rather than an absent one, so that a
 * missing answer can never be mistaken for a completed exercise.
 */
export type LearnerAnswer =
  | { kind: "choice"; optionId: string }
  | { kind: "text"; value: string }
  | { kind: "self-assessed" };

export interface GradeResult {
  correct: boolean;
  /**
   * The canonical right answer, for the "the answer was ..." line shown after
   * a miss. Undefined when there is nothing to reveal (self-assessed), or when
   * the correct option is audio-only and has no text to show.
   */
  expected?: string;
}

/**
 * Grade one submitted answer.
 *
 * Throws when the answer's kind does not match the exercise's response kind.
 * That combination is a bug in the player — the UI chooses the input widget
 * from the very same response object — and a wrong-shaped answer silently
 * scored `false` would look to a learner exactly like being marked wrong.
 * Failing loudly keeps that bug in front of a developer instead of a learner.
 */
export function gradeExercise(
  exercise: Exercise,
  answer: LearnerAnswer
): GradeResult {
  const { response } = exercise;

  switch (response.kind) {
    case "choice": {
      if (answer.kind !== "choice") {
        throw new Error(
          `Exercise "${exercise.id}" expects a choice answer, got "${answer.kind}"`
        );
      }
      const correctOption = response.options.find(
        (option) => option.id === response.correctOptionId
      );
      return {
        correct: answer.optionId === response.correctOptionId,
        expected: correctOption?.label,
      };
    }

    case "text": {
      if (answer.kind !== "text") {
        throw new Error(
          `Exercise "${exercise.id}" expects a text answer, got "${answer.kind}"`
        );
      }
      return {
        correct: matchesAcceptedAnswer(
          answer.value,
          response.acceptedAnswers,
          response.matching
        ),
        // By convention the first accepted answer is the canonical spelling;
        // the rest are tolerated variants and would be odd to show back.
        expected: response.acceptedAnswers[0],
      };
    }

    case "self-assessed": {
      if (answer.kind !== "self-assessed") {
        throw new Error(
          `Exercise "${exercise.id}" expects a self-assessed answer, got "${answer.kind}"`
        );
      }
      // Always correct, by design. See the `listen-and-repeat` note in
      // src/types/content.ts: there is no on-device way to score speech, so
      // the exercise scores participation and earns reduced XP instead of
      // pretending to a judgement it cannot make.
      return { correct: true };
    }

    case "composite": {
      throw new Error(
        `Exercise "${exercise.id}" is a quiz and is never graded directly — ` +
          `expand it with expandLessonSequence() and grade its items`
      );
    }
  }
}

// ─── Lesson sequencing ────────────────────────────────────────────────────────

/**
 * One position in the walk-through of a lesson.
 *
 * A quiz re-asks exercises the learner has already seen, so the same
 * `exercise.id` can appear more than once in a sequence. `key` is what is
 * unique per position — use it, not the exercise id, to track attempts.
 */
export interface SequenceItem {
  key: string;
  exercise: Exercise;
  /** Id of the quiz exercise this item belongs to, when it is a quiz item. */
  quizId?: string;
}

/**
 * Flatten a lesson document into the ordered list of things to present.
 *
 * Quiz exercises are replaced in place by the exercises they reference, so the
 * player never has to know that quizzes are a different sort of thing — it
 * walks a flat list and grades each item the same way.
 *
 * References that do not resolve are skipped rather than throwing. A published
 * document should never contain one (validateLessonDocument rejects it), but
 * if a bad document ever reaches a device, dropping one quiz item degrades the
 * lesson while a throw would make it unopenable.
 */
export function expandLessonSequence(document: LessonDocument): SequenceItem[] {
  const byId = new Map(document.exercises.map((e) => [e.id, e]));
  const items: SequenceItem[] = [];

  for (const exercise of document.exercises) {
    if (exercise.response.kind !== "composite") {
      items.push({ key: exercise.id, exercise });
      continue;
    }

    for (const referencedId of exercise.response.exerciseIds) {
      const referenced = byId.get(referencedId);
      if (!referenced || referenced.response.kind === "composite") continue;

      items.push({
        key: `${exercise.id}:${referencedId}`,
        exercise: referenced,
        quizId: exercise.id,
      });
    }
  }

  return items;
}

/** True when this exercise is scored by the learner rather than by a rule. */
export function isSelfAssessed(exercise: Exercise): boolean {
  return exercise.response.kind === "self-assessed";
}
