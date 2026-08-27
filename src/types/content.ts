/**
 * src/types/content.ts
 *
 * Content schema v1 — the shape of a published lesson document.
 *
 * This is the contract between the content backend and the app. A lesson is
 * stored as ONE versioned JSON document (the `content` jsonb column), not as
 * normalized rows, because the client always wants the whole lesson at once:
 * one fetch, one cache entry, one version number to diff against.
 *
 * Everything the player needs to render and GRADE a lesson lives in the
 * document. There is deliberately no server round-trip to check an answer —
 * see src/features/learning/grading.ts.
 *
 * ─── Relationship to src/types/learning.ts ───────────────────────────────────
 * learning.ts is the OLD bundled-content schema, still live until the lesson
 * player migrates onto this one. `LanguageId` is imported from there rather
 * than redefined so there is exactly one definition of the language dimension
 * while both files coexist; it moves here when learning.ts is deleted.
 *
 * ─── The type/response split ─────────────────────────────────────────────────
 * `ExerciseType` says what an exercise IS pedagogically ("this is a listening
 * exercise"). `Response` says how the learner ANSWERS it, and it alone
 * determines grading. They are separate because they vary independently: a
 * listening exercise can be answered by picking an option or by typing, and a
 * translation and a reading exercise grade identically despite teaching
 * different things.
 *
 * The payoff is that grading has four cases (one per response kind) instead of
 * one per exercise type, so adding a pedagogical type later is a content and
 * UI change with no new grading code. Which pairings are legal is enforced by
 * validateLessonDocument(), not by the type system — see validate.ts for why.
 */

import type { LanguageId } from "@/types/learning";

export type { LanguageId };

/**
 * Bumped only for a BREAKING change to the document shape. The client refuses
 * documents it does not understand rather than rendering them half-parsed;
 * additive, backward-compatible fields do not bump this.
 */
export const CONTENT_SCHEMA_VERSION = 1;

// ─── Media ────────────────────────────────────────────────────────────────────

/**
 * A reference to one pre-recorded audio clip in the content CDN.
 *
 * `hash` is the content hash that also forms the stored filename, which is why
 * the URL is safe to cache forever: changed audio is a different hash, so it
 * is a different URL and a different file. Cache invalidation is therefore
 * never a matter of guessing a TTL.
 *
 * `durationMs` and `bytes` are recorded at publish time so the client can size
 * a progress bar and budget a unit pre-download without first fetching the
 * file it is trying to decide about.
 */
export interface MediaRef {
  url: string;
  hash: string;
  durationMs: number;
  bytes?: number;
}

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export interface VocabularyEntry {
  id: string;
  /** The term in Ajami script. */
  ajami: string;
  /** Latin-script rendering, e.g. "baba". */
  transliteration: string;
  /** Meaning in the learner's language of instruction. */
  translation: string;
  audio?: MediaRef;
}

// ─── Exercises ────────────────────────────────────────────────────────────────

/**
 * What an exercise teaches. Drives presentation and iconography only — never
 * grading (see the file header).
 *
 * `listen-and-repeat` replaces the old `speaking` type. Speech can only be
 * graded by a speech recognizer, and a recognizer is exactly the runtime AI
 * dependency this content model exists to remove, so the exercise keeps the
 * pronunciation practice and drops the pretence of scoring it: the learner
 * hears the reference clip, repeats it, and self-reports. It is always scored
 * correct and earns reduced XP.
 */
export type ExerciseType =
  | "letter-recognition"
  | "word-formation"
  | "reading"
  | "listen-and-repeat"
  | "listening"
  | "translation"
  | "multiple-choice"
  | "lesson-quiz";

/** One selectable answer. Audio-only options omit `label`. */
export interface ChoiceOption {
  id: string;
  label?: string;
  audio?: MediaRef;
}

/**
 * How free-text answers are compared. Every flag defaults to the LENIENT
 * setting, because a learner who knew the answer and typed it without the
 * diacritics their keyboard cannot produce got it right.
 *
 * Note what normalization cannot do for you: Hausa ɓ/ɗ/ƙ and Wolof ñ are
 * distinct letters, not accented Latin ones, so stripping diacritics will not
 * turn "ɓera" into "bera". When a plain-keyboard spelling should pass, the
 * author lists it in `acceptedAnswers` — a content decision, kept out of the
 * grading code.
 */
export interface MatchingPolicy {
  /** Default false — "Baba" matches "baba". */
  caseSensitive?: boolean;
  /** Default true — Arabic harakat and Latin combining marks are ignored. */
  stripDiacritics?: boolean;
  /** Default true — punctuation and tatweel are ignored. */
  stripPunctuation?: boolean;
}

/**
 * How the learner answers, and therefore how the answer is graded.
 *
 * - `choice`      one correct option out of 2–4
 * - `text`        typed, matched against an explicit accepted-answers list
 * - `self-assessed` learner reports whether they managed it; always correct
 * - `composite`   a quiz that re-runs other exercises from this same document
 */
export type Response =
  | {
      kind: "choice";
      options: ChoiceOption[];
      correctOptionId: string;
    }
  | {
      kind: "text";
      /**
       * Every spelling that counts as correct, compared after normalization.
       * Never empty. The first entry is the canonical answer shown to a
       * learner who gets it wrong.
       */
      acceptedAnswers: string[];
      matching?: MatchingPolicy;
    }
  | {
      kind: "self-assessed";
    }
  | {
      kind: "composite";
      /**
       * Ids of exercises defined earlier in THIS document, re-asked in this
       * order. Ids rather than copies so a fix to an exercise cannot leave a
       * stale duplicate inside the quiz — and the document stays
       * self-contained, since the referent is always in the same file.
       */
      exerciseIds: string[];
    };

/** What is presented to the learner: any combination of text and audio. */
export interface ExerciseStem {
  /** e.g. the Ajami word to read. */
  text?: string;
  /** Latin-script support text, shown under `text` when present. */
  transliteration?: string;
  /** The clip for listening and listen-and-repeat exercises. */
  audio?: MediaRef;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  /** The instruction, e.g. "Which letter makes the 'A' sound?" */
  prompt: string;
  stem?: ExerciseStem;
  response: Response;
  /** Optional nudge, revealed on request or after a wrong attempt. */
  hint?: string;
  /** Links this exercise to the term it drills, for review scheduling later. */
  vocabularyId?: string;
}

// ─── Lesson document ──────────────────────────────────────────────────────────

export type LessonStage = 1 | 2 | 3 | 4 | 5;

/**
 * The published body of one lesson — the `content` jsonb column.
 *
 * Note there is no `aiTeacherPrompt`. Authoring guidance for whoever (or
 * whatever) writes the lesson lives in `authoringNotes`, which is metadata
 * about the document rather than something the client renders; nothing in the
 * learner flow reads it.
 */
export interface LessonDocument {
  schemaVersion: number;
  id: string;
  unitId: string;
  languageId: LanguageId;
  title: string;
  description: string;
  stage: LessonStage;
  goals: string[];
  vocabulary: VocabularyEntry[];
  /** Ordered — this is the sequence the player walks through. */
  exercises: Exercise[];
  /** Editorial notes for content authors. Never shown to a learner. */
  authoringNotes?: string;
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

/**
 * The manifest is the tree the client diffs against its cache to decide what
 * to download. It carries versions and media references but NOT lesson bodies,
 * so it stays small enough to fetch on every app open.
 */

export interface ManifestLesson {
  id: string;
  order: number;
  title: string;
  /** Incremented on every publish. The unit of cache invalidation. */
  version: number;
  /**
   * Number of exercises, so the lesson list can show "6 exercises" without
   * downloading every document just to count them. Computed at publish time.
   */
  exerciseCount: number;
  /** Every clip this lesson needs, for whole-unit pre-download. */
  media: MediaRef[];
}

export interface ManifestUnit {
  id: string;
  order: number;
  title: string;
  description: string;
  lessons: ManifestLesson[];
}

export interface ContentManifest {
  schemaVersion: number;
  languageId: LanguageId;
  /** Server timestamp of this manifest build, for display and debugging. */
  generatedAt: string;
  units: ManifestUnit[];
}
