/**
 * src/constants/xp.ts
 *
 * Every number that decides how much XP something is worth, in one place.
 *
 * These are game-balance dials, not facts about the domain, and they get
 * retuned once real learners are using the app. Centralising them means a
 * retune is a one-file diff whose effect is obvious, rather than a hunt
 * through the player, the store and the summary screen for stray `+ 10`s.
 *
 * The rules are deliberately simple and additive:
 *
 *   lesson XP = completion award
 *             + per-exercise awards
 *             + quiz bonus        (if the lesson has a quiz, all correct first try)
 *             + perfect bonus     (if every exercise was correct first try)
 *
 * "First try" is what earns the per-exercise award. Retrying until you land on
 * the right option is how a learner explores an exercise, and it should not be
 * scored the same as knowing it — but it still counts as completing the
 * lesson, so the completion award is unconditional. Getting something wrong
 * never costs XP: a scoring system that punishes practice discourages the
 * exact behaviour the app wants.
 */

/** Awarded once for finishing a lesson, however many attempts it took. */
export const XP_LESSON_COMPLETION = 10;

/** Awarded per exercise answered correctly on the first attempt. */
export const XP_EXERCISE_FIRST_TRY = 2;

/**
 * Awarded per self-assessed exercise (listen-and-repeat). Lower than a graded
 * exercise because the learner marks their own work — it should still be worth
 * doing, without being the cheapest route to XP.
 */
export const XP_EXERCISE_SELF_ASSESSED = 1;

/** Bonus when a lesson's end-of-lesson quiz is answered perfectly. */
export const XP_QUIZ_BONUS = 5;

/** Bonus when every exercise in a lesson was correct on the first attempt. */
export const XP_PERFECT_LESSON_BONUS = 5;

/** Default daily XP target shown on the home screen's goal card. */
export const DEFAULT_DAILY_GOAL = 20;
