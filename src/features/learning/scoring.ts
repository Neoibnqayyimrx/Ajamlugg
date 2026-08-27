/**
 * src/features/learning/scoring.ts
 *
 * Turns a finished lesson's attempt log into XP and a summary. Pure — the
 * numbers it uses all come from src/constants/xp.ts, and it reads no state of
 * its own.
 *
 * Kept apart from grading.ts on purpose: grading answers "was that right?",
 * which is a fact about the content and will not change. Scoring answers "what
 * is that worth?", which is a product decision that will be retuned. Mixing
 * them would mean every XP experiment risks disturbing correctness.
 *
 * Being pure also makes the offline story work: a device that finished a
 * lesson in airplane mode computes exactly the XP the server would have, so
 * the sync in Phase 5 uploads a result rather than asking for one.
 */

import {
  XP_EXERCISE_FIRST_TRY,
  XP_EXERCISE_SELF_ASSESSED,
  XP_LESSON_COMPLETION,
  XP_PERFECT_LESSON_BONUS,
  XP_QUIZ_BONUS,
} from "@/constants/xp";

/**
 * The record of one position in the lesson sequence, as the player observed
 * it. One per SequenceItem, keyed by that item's `key`.
 */
export interface Attempt {
  /** SequenceItem.key — unique per position, since quizzes re-ask exercises. */
  key: string;
  /** Correct on the very first submission for this position. */
  correctFirstTry: boolean;
  /** This position was a listen-and-repeat, scored by the learner. */
  selfAssessed: boolean;
  /** This position was part of the end-of-lesson quiz. */
  isQuizItem: boolean;
}

export interface LessonScore {
  /** Total XP earned for the lesson. */
  xp: number;
  /** Positions in the lesson. */
  total: number;
  /** Positions answered correctly on the first try. */
  correctFirstTry: number;
  /** correctFirstTry / total, in [0, 1]. 0 for an empty lesson. */
  accuracy: number;
  /** Every position correct first try. False for an empty lesson. */
  perfect: boolean;
  /** The lesson had a quiz and every quiz item was correct first try. */
  quizPerfect: boolean;
  /** Breakdown, so the summary screen can itemise where the XP came from. */
  breakdown: {
    completion: number;
    exercises: number;
    quizBonus: number;
    perfectBonus: number;
  };
}

/**
 * Score a completed lesson.
 *
 * Self-assessed positions count toward completion and earn their (smaller)
 * award, but are excluded from `perfect` and from accuracy — a learner cannot
 * fail one, so counting them would inflate both figures and make a genuinely
 * perfect run indistinguishable from a lesson full of taps.
 */
export function computeLessonScore(attempts: readonly Attempt[]): LessonScore {
  const graded = attempts.filter((a) => !a.selfAssessed);
  const selfAssessed = attempts.filter((a) => a.selfAssessed);
  const quizItems = attempts.filter((a) => a.isQuizItem && !a.selfAssessed);

  const correctFirstTry = graded.filter((a) => a.correctFirstTry).length;

  const perfect = graded.length > 0 && correctFirstTry === graded.length;
  const quizPerfect =
    quizItems.length > 0 && quizItems.every((a) => a.correctFirstTry);

  const exercises =
    correctFirstTry * XP_EXERCISE_FIRST_TRY +
    selfAssessed.length * XP_EXERCISE_SELF_ASSESSED;

  const breakdown = {
    completion: XP_LESSON_COMPLETION,
    exercises,
    quizBonus: quizPerfect ? XP_QUIZ_BONUS : 0,
    perfectBonus: perfect ? XP_PERFECT_LESSON_BONUS : 0,
  };

  return {
    xp:
      breakdown.completion +
      breakdown.exercises +
      breakdown.quizBonus +
      breakdown.perfectBonus,
    total: attempts.length,
    correctFirstTry,
    accuracy: graded.length === 0 ? 0 : correctFirstTry / graded.length,
    perfect,
    quizPerfect,
    breakdown,
  };
}
