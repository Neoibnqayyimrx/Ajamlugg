/**
 * src/store/useProgressStore.ts
 *
 * Zustand store for the learner's real progress: which lessons they've
 * finished, XP earned per day, and their day streak. Persisted with
 * AsyncStorage, following the same persist pattern as useLanguageStore.ts /
 * useCaptionsStore.ts — the app's existing precedent — so progress survives
 * app restarts (offline-first principle, per AGENTS.md).
 *
 * Replaces the hardcoded STREAK_DAYS / XP_TODAY / MOCK_COMPLETED constants
 * that previously lived in the home, learn, and profile screens and never
 * changed no matter what the learner did.
 *
 * Design notes:
 *
 *  - "XP today" and "is the streak still alive" are DERIVED from stored
 *    dates rather than stored as numbers (see the selectors at the bottom).
 *    A stored `xpToday` would silently go stale at midnight; a derived one
 *    is correct on every render without a timer or a background job.
 *
 *  - Lesson ids are already globally unique and language-prefixed
 *    ("hausa-lesson-1-1"), so one flat completed-id list covers every
 *    language without nesting by LanguageId — and it can't drift out of
 *    sync with the LanguageId union the way the old Record<LanguageId, …>
 *    mock did.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { DEFAULT_DAILY_GOAL, XP_LESSON_COMPLETION } from "@/constants/xp";

// See useLanguageStore.ts for why this no-op storage is needed during
// Node-side SSR rendering (AsyncStorage's web backend touches `window`).
const noopStorage: StateStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

/**
 * XP rules live in src/constants/xp.ts, which is the one place they are
 * tunable. These re-exports keep the existing import sites working rather
 * than defining a second, drifting copy of the same numbers here.
 */
export {
  DEFAULT_DAILY_GOAL,
  XP_LESSON_COMPLETION as XP_PER_LESSON,
} from "@/constants/xp";

// ─── Date helpers ─────────────────────────────────────────────────────────────
// Keys are LOCAL calendar days ("YYYY-MM-DD"), not UTC — a learner practising
// at 9pm should get credit for that day in their own timezone, not the next
// day's because UTC has already rolled over.

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayKey(): string {
  return dayKey(new Date());
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

// ─── State & actions ──────────────────────────────────────────────────────────

interface ProgressState {
  /** Lesson ids the learner has finished at least one full session of. */
  completedLessonIds: string[];

  /** XP earned per local calendar day, keyed "YYYY-MM-DD". */
  xpByDay: Record<string, number>;

  /** Lifetime XP — never decays, unlike the daily figure. */
  xpTotal: number;

  /**
   * Consecutive-day streak as of `lastActiveDay`. Read it through
   * `selectStreakDays` rather than directly: a stored streak whose
   * `lastActiveDay` is older than yesterday has already been broken, and
   * only the selector knows that.
   */
  streakDays: number;

  /** Local day of the learner's most recent XP-earning activity. */
  lastActiveDay: string | null;

  /** The learner's daily XP target. */
  dailyGoal: number;

  /** True once the persisted value has been read back from AsyncStorage. */
  isHydrated: boolean;

  /**
   * Record a finished lesson: marks it complete (idempotent — repeating a
   * lesson never double-counts it) and always awards the XP, since practising
   * a lesson again is still practice.
   *
   * `xpEarned` is computed by computeLessonScore() from what the learner
   * actually did, so a flawless run is worth more than a scraped pass. It
   * defaults to the bare completion award for callers that have no exercise
   * log to score — the audio lesson, which has no gradable exercises.
   */
  completeLesson: (lessonId: string, xpEarned?: number) => void;

  /** Award XP without completing a lesson (advances the streak too). */
  addXp: (amount: number) => void;

  /** Wipe all progress — powers the Profile "Reset progress" action. */
  resetProgress: () => void;
}

const INITIAL_PROGRESS = {
  completedLessonIds: [] as string[],
  xpByDay: {} as Record<string, number>,
  xpTotal: 0,
  streakDays: 0,
  lastActiveDay: null as string | null,
  dailyGoal: DEFAULT_DAILY_GOAL,
};

/**
 * Shared streak/XP bookkeeping for anything that counts as activity.
 *
 * Streak rules:
 *   - already active today  → streak unchanged (still the same day)
 *   - active yesterday      → streak + 1
 *   - anything else         → streak restarts at 1 (first day, or broken)
 */
function applyActivity(state: ProgressState, xp: number) {
  const today = todayKey();
  const streakDays =
    state.lastActiveDay === today
      ? state.streakDays
      : state.lastActiveDay === yesterdayKey()
        ? state.streakDays + 1
        : 1;

  return {
    xpByDay: { ...state.xpByDay, [today]: (state.xpByDay[today] ?? 0) + xp },
    xpTotal: state.xpTotal + xp,
    streakDays,
    lastActiveDay: today,
  };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      ...INITIAL_PROGRESS,
      isHydrated: false,

      completeLesson: (lessonId, xpEarned = XP_LESSON_COMPLETION) =>
        set((state) => ({
          completedLessonIds: state.completedLessonIds.includes(lessonId)
            ? state.completedLessonIds
            : [...state.completedLessonIds, lessonId],
          ...applyActivity(state, xpEarned),
        })),

      addXp: (amount) => set((state) => applyActivity(state, amount)),

      resetProgress: () => set({ ...INITIAL_PROGRESS }),
    }),
    {
      name: "ajamlugg-progress",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : AsyncStorage
      ),

      // isHydrated is a runtime-only flag and must never be written to (or
      // restored from) AsyncStorage — same reasoning as useLanguageStore.
      partialize: (state) => ({
        completedLessonIds: state.completedLessonIds,
        xpByDay: state.xpByDay,
        xpTotal: state.xpTotal,
        streakDays: state.streakDays,
        lastActiveDay: state.lastActiveDay,
        dailyGoal: state.dailyGoal,
      }),

      onRehydrateStorage: () => () => {
        useProgressStore.setState({ isHydrated: true });
      },
    }
  )
);

// ─── Derived selectors ────────────────────────────────────────────────────────
// Pass these to useProgressStore(...) so the value is recomputed against the
// current date on every render, instead of going stale at midnight.

/** XP earned so far today (0 on a fresh day). */
export const selectXpToday = (state: ProgressState): number =>
  state.xpByDay[todayKey()] ?? 0;

/**
 * The streak as the learner should see it. A stored streak only still counts
 * if they were active today or yesterday — otherwise a day was missed and
 * the streak is already broken, whatever the stored number says.
 */
export const selectStreakDays = (state: ProgressState): number => {
  if (state.lastActiveDay === todayKey() || state.lastActiveDay === yesterdayKey()) {
    return state.streakDays;
  }
  return 0;
};

/** Has the learner finished at least one lesson today? */
export const selectPractisedToday = (state: ProgressState): boolean =>
  (state.xpByDay[todayKey()] ?? 0) > 0;
