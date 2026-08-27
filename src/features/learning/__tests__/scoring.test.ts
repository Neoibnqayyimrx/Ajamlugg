import {
  XP_EXERCISE_FIRST_TRY,
  XP_EXERCISE_SELF_ASSESSED,
  XP_LESSON_COMPLETION,
  XP_PERFECT_LESSON_BONUS,
  XP_QUIZ_BONUS,
} from "@/constants/xp";

import { computeLessonScore, type Attempt } from "../scoring";

/**
 * Assertions are written against the XP_* constants rather than literal
 * numbers. These values are explicitly tunable dials, and a test that hardcodes
 * `21` fails on a balance change that broke nothing — training everyone to
 * update tests without reading them.
 */

const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  key: "ex-1",
  correctFirstTry: true,
  selfAssessed: false,
  isQuizItem: false,
  ...overrides,
});

describe("computeLessonScore", () => {
  it("awards completion, per-exercise and perfect XP for a flawless lesson", () => {
    const score = computeLessonScore([
      attempt({ key: "a" }),
      attempt({ key: "b" }),
      attempt({ key: "c" }),
    ]);

    expect(score.xp).toBe(
      XP_LESSON_COMPLETION + 3 * XP_EXERCISE_FIRST_TRY + XP_PERFECT_LESSON_BONUS
    );
    expect(score.perfect).toBe(true);
    expect(score.accuracy).toBe(1);
    expect(score.correctFirstTry).toBe(3);
    expect(score.total).toBe(3);
  });

  it("still awards completion when nothing was correct — practice is not punished", () => {
    const score = computeLessonScore([
      attempt({ key: "a", correctFirstTry: false }),
      attempt({ key: "b", correctFirstTry: false }),
    ]);

    expect(score.xp).toBe(XP_LESSON_COMPLETION);
    expect(score.perfect).toBe(false);
    expect(score.accuracy).toBe(0);
  });

  it("pays per-exercise XP only for first-try answers", () => {
    const score = computeLessonScore([
      attempt({ key: "a" }),
      attempt({ key: "b", correctFirstTry: false }),
    ]);

    expect(score.breakdown.exercises).toBe(XP_EXERCISE_FIRST_TRY);
    expect(score.xp).toBe(XP_LESSON_COMPLETION + XP_EXERCISE_FIRST_TRY);
    expect(score.perfect).toBe(false);
  });

  it("pays the reduced rate for self-assessed exercises", () => {
    const score = computeLessonScore([
      attempt({ key: "a", selfAssessed: true }),
      attempt({ key: "b", selfAssessed: true }),
    ]);
    expect(score.breakdown.exercises).toBe(2 * XP_EXERCISE_SELF_ASSESSED);
  });

  // Self-assessed items cannot be failed, so counting them would make a lesson
  // of taps indistinguishable from a genuinely perfect run.
  it("excludes self-assessed items from accuracy and from `perfect`", () => {
    const score = computeLessonScore([
      attempt({ key: "a" }),
      attempt({ key: "b", selfAssessed: true }),
    ]);

    expect(score.accuracy).toBe(1);
    expect(score.correctFirstTry).toBe(1);
    expect(score.total).toBe(2);
    expect(score.perfect).toBe(true);
  });

  it("does not call an all-self-assessed lesson perfect", () => {
    const score = computeLessonScore([
      attempt({ key: "a", selfAssessed: true }),
      attempt({ key: "b", selfAssessed: true }),
    ]);
    expect(score.perfect).toBe(false);
    expect(score.breakdown.perfectBonus).toBe(0);
  });

  it("awards the quiz bonus when every quiz item is right first try", () => {
    const score = computeLessonScore([
      attempt({ key: "a" }),
      attempt({ key: "quiz:a", isQuizItem: true }),
      attempt({ key: "quiz:b", isQuizItem: true }),
    ]);
    expect(score.quizPerfect).toBe(true);
    expect(score.breakdown.quizBonus).toBe(XP_QUIZ_BONUS);
  });

  it("withholds the quiz bonus when a quiz item was missed", () => {
    const score = computeLessonScore([
      attempt({ key: "a" }),
      attempt({ key: "quiz:a", isQuizItem: true }),
      attempt({ key: "quiz:b", isQuizItem: true, correctFirstTry: false }),
    ]);
    expect(score.quizPerfect).toBe(false);
    expect(score.breakdown.quizBonus).toBe(0);
  });

  it("gives no quiz bonus to a lesson that has no quiz", () => {
    const score = computeLessonScore([attempt({ key: "a" })]);
    expect(score.quizPerfect).toBe(false);
    expect(score.breakdown.quizBonus).toBe(0);
  });

  it("breaks the total down into parts that sum to it", () => {
    const score = computeLessonScore([
      attempt({ key: "a" }),
      attempt({ key: "b", selfAssessed: true }),
      attempt({ key: "quiz:a", isQuizItem: true }),
    ]);

    const { completion, exercises, quizBonus, perfectBonus } = score.breakdown;
    expect(completion + exercises + quizBonus + perfectBonus).toBe(score.xp);
  });

  it("handles an empty attempt log without dividing by zero", () => {
    const score = computeLessonScore([]);
    expect(score.xp).toBe(XP_LESSON_COMPLETION);
    expect(score.accuracy).toBe(0);
    expect(score.perfect).toBe(false);
  });
});
