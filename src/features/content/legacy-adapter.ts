/**
 * src/features/content/legacy-adapter.ts
 *
 * Converts the hand-written lessons in src/data/* into content-schema
 * documents.
 *
 * ─── Why this exists at all ──────────────────────────────────────────────────
 * Those files are the only Ajami content anyone has written, and they are
 * real editorial work. Rather than retype twenty lessons into the new shape by
 * hand — and quietly introduce typos into a script most reviewers cannot
 * proofread — the mapping is done mechanically here and every result is checked
 * by the Phase 1 validator in the tests. A conversion bug fails CI instead of
 * reaching a learner.
 *
 * ─── Why it runs at import time rather than as a codegen step ────────────────
 * The output is the app's BUNDLED SNAPSHOT: the content a learner sees on a
 * fresh install before the first sync has finished. Deriving it from the
 * source data means the snapshot cannot drift from src/data the way a
 * committed generated file would. The conversion is a few milliseconds of pure
 * array work over ~20 lessons, done once per app start.
 *
 * Phase 3 seeds Supabase from this same function, so the CMS and the bundled
 * fallback are guaranteed to start from identical documents.
 *
 * ─── The mapping ─────────────────────────────────────────────────────────────
 *   letter-recognition | word-formation | reading, with options -> choice
 *   word-formation | reading, without options                   -> text
 *   speaking                                    -> listen-and-repeat (self-assessed)
 *
 * `aiTeacherPrompt` becomes `authoringNotes`. It is editorial guidance about
 * how to teach the lesson, which is worth keeping for whoever writes the next
 * one — but nothing in the learner flow reads it, and it is not sent to any
 * model. It is metadata about the document, not part of it.
 */

import { LESSONS } from "@/data/lessons";
import { UNITS } from "@/data/units";
import type {
  ContentManifest,
  Exercise,
  ExerciseType,
  LanguageId,
  LessonDocument,
  ManifestUnit,
  VocabularyEntry,
} from "@/types/content";
import { CONTENT_SCHEMA_VERSION } from "@/types/content";
import type {
  Activity,
  ActivityType,
  Lesson,
  Vocabulary,
} from "@/types/learning";

/**
 * Version stamped on every migrated lesson.
 *
 * Bundled content is version 1 of each lesson by definition — it is the
 * original. Anything the CMS publishes later carries a higher number, so the
 * sync in Phase 4 always prefers server content over the snapshot without
 * needing a separate "is this the bundled one?" flag.
 */
export const BUNDLED_LESSON_VERSION = 1;

/** How each legacy activity type maps into the new pedagogical vocabulary. */
const TYPE_MAP: Record<ActivityType, ExerciseType> = {
  "letter-recognition": "letter-recognition",
  "word-formation": "word-formation",
  reading: "reading",
  // The rename that removes speech recognition from the learner's path. See
  // the `listen-and-repeat` note in src/types/content.ts.
  speaking: "listen-and-repeat",
};

/**
 * Pull the thing being shown out of a legacy prompt.
 *
 * Legacy prompts embed their subject in the sentence ("Pronounce this letter:
 * ب"), because the old flow handed the whole string to a speaking agent. The
 * player needs the subject on its own, large and centred, so it is split off
 * at the colon.
 *
 * Falls back to the correct answer when there is no colon — for those the
 * learner is being asked to produce the answer, so the answer IS the subject.
 */
function extractStemText(activity: Activity): string | undefined {
  const colonIndex = activity.prompt.lastIndexOf(":");
  if (colonIndex >= 0) {
    const tail = activity.prompt.slice(colonIndex + 1).trim();
    if (tail.length > 0) return tail;
  }
  return activity.vocabulary?.ajami ?? activity.correctAnswer;
}

/** The instruction, with any embedded subject removed. */
function extractPrompt(activity: Activity): string {
  const colonIndex = activity.prompt.lastIndexOf(":");
  if (colonIndex >= 0) {
    const head = activity.prompt.slice(0, colonIndex).trim();
    if (head.length > 0) return head;
  }
  return activity.prompt;
}

function toVocabularyEntry(vocabulary: Vocabulary): VocabularyEntry {
  return {
    id: vocabulary.id,
    ajami: vocabulary.ajami,
    transliteration: vocabulary.transliteration,
    translation: vocabulary.translation,
    // Legacy `audioUrl` is dropped rather than carried over: the new schema
    // needs a hash and duration to cache a clip, and a bare URL supplies
    // neither. No legacy lesson sets it today, so nothing is actually lost.
  };
}

function convertActivity(activity: Activity): Exercise {
  const type = TYPE_MAP[activity.type];

  const base = {
    id: activity.id,
    type,
    vocabularyId: activity.vocabularyId ?? activity.vocabulary?.id,
  };

  if (type === "listen-and-repeat") {
    return {
      ...base,
      prompt: extractPrompt(activity),
      stem: { text: extractStemText(activity) },
      response: { kind: "self-assessed" },
    };
  }

  // Multiple choice, when the author supplied options.
  if (activity.options && activity.options.length >= 2) {
    const options = activity.options.map((label, index) => ({
      // Positional ids. The option TEXT cannot be an id: several legacy
      // exercises repeat a glyph across their options, and duplicate ids
      // would make the correct answer ambiguous.
      id: `${activity.id}-opt-${index}`,
      label,
    }));

    const correctIndex = activity.options.indexOf(activity.correctAnswer);
    if (correctIndex < 0) {
      // Unreachable for the current data, and asserted against in the tests.
      // Throwing beats emitting a lesson whose right answer is not offered.
      throw new Error(
        `Activity "${activity.id}": correctAnswer "${activity.correctAnswer}" ` +
          `is not among its options`
      );
    }

    return {
      ...base,
      prompt: activity.prompt,
      response: {
        kind: "choice",
        options,
        correctOptionId: options[correctIndex].id,
      },
    };
  }

  // No options — the learner types it.
  return {
    ...base,
    prompt: extractPrompt(activity),
    stem: { text: extractStemText(activity) },
    response: {
      kind: "text",
      acceptedAnswers: [activity.correctAnswer],
    },
  };
}

/**
 * Collect the vocabulary a lesson needs.
 *
 * Legacy activities reference vocabulary by id ACROSS lessons — lesson 1-2
 * points at "voc-ba", which is defined inside lesson 1-1. A document has to
 * stand alone (that is what makes one fetch and one cache entry enough), so
 * referenced entries are copied in from wherever they were first defined.
 */
function collectVocabulary(
  lesson: Lesson,
  globalVocabulary: Map<string, Vocabulary>
): VocabularyEntry[] {
  const entries = new Map<string, VocabularyEntry>();

  for (const activity of lesson.activities) {
    if (activity.vocabulary) {
      entries.set(activity.vocabulary.id, toVocabularyEntry(activity.vocabulary));
    }
    const referencedId = activity.vocabularyId;
    if (referencedId && !entries.has(referencedId)) {
      const referenced = globalVocabulary.get(referencedId);
      if (referenced) entries.set(referencedId, toVocabularyEntry(referenced));
    }
  }

  return [...entries.values()];
}

/** Every vocabulary entry defined anywhere, so cross-lesson refs can resolve. */
function buildGlobalVocabulary(lessons: readonly Lesson[]) {
  const all = new Map<string, Vocabulary>();
  for (const lesson of lessons) {
    for (const activity of lesson.activities) {
      if (activity.vocabulary && !all.has(activity.vocabulary.id)) {
        all.set(activity.vocabulary.id, activity.vocabulary);
      }
    }
  }
  return all;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Convert one legacy lesson. Exported for the tests to exercise directly. */
export function convertLesson(
  lesson: Lesson,
  languageId: LanguageId,
  globalVocabulary: Map<string, Vocabulary>
): LessonDocument {
  const vocabulary = collectVocabulary(lesson, globalVocabulary);
  const vocabularyIds = new Set(vocabulary.map((entry) => entry.id));

  const exercises = lesson.activities.map((activity) => {
    const exercise = convertActivity(activity);
    // Drop a link the copy step could not satisfy. A dangling id fails
    // validation, and losing the association is a smaller loss than losing
    // the lesson.
    if (exercise.vocabularyId && !vocabularyIds.has(exercise.vocabularyId)) {
      return { ...exercise, vocabularyId: undefined };
    }
    return exercise;
  });

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    id: lesson.id,
    unitId: lesson.unitId,
    languageId,
    title: lesson.title,
    description: lesson.description,
    stage: lesson.stage,
    goals: lesson.goals,
    vocabulary,
    exercises,
    authoringNotes: lesson.aiTeacherPrompt,
  };
}

/** Every legacy lesson, converted, keyed by lesson id. */
export function buildBundledDocuments(): Map<string, LessonDocument> {
  const globalVocabulary = buildGlobalVocabulary(LESSONS);
  const unitLanguage = new Map(UNITS.map((unit) => [unit.id, unit.languageId]));

  const documents = new Map<string, LessonDocument>();
  for (const lesson of LESSONS) {
    const languageId = unitLanguage.get(lesson.unitId);
    // A lesson whose unit was deleted has nowhere to appear, so it is skipped
    // rather than guessed at.
    if (!languageId) continue;
    documents.set(lesson.id, convertLesson(lesson, languageId, globalVocabulary));
  }
  return documents;
}

/**
 * The manifest describing the bundled snapshot for one language.
 *
 * Shaped exactly like the server's manifest so that the sync layer in Phase 4
 * can diff bundled against remote with one code path. `media` is empty for
 * every bundled lesson: the hand-written content has no recordings yet.
 */
export function buildBundledManifest(languageId: LanguageId): ContentManifest {
  const documents = buildBundledDocuments();

  const units: ManifestUnit[] = UNITS.filter(
    (unit) => unit.languageId === languageId
  )
    .sort((a, b) => a.order - b.order)
    .map((unit) => ({
      id: unit.id,
      order: unit.order,
      title: unit.title,
      description: unit.description,
      lessons: unit.lessonIds
        .map((lessonId, index) => {
          const document = documents.get(lessonId);
          if (!document) return null;
          return {
            id: lessonId,
            order: index + 1,
            title: document.title,
            version: BUNDLED_LESSON_VERSION,
            exerciseCount: document.exercises.length,
            media: [],
          };
        })
        .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== null),
    }));

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    languageId,
    // Bundled content is as old as the build, and a fixed epoch keeps this
    // value deterministic — a Date.now() here would make every snapshot
    // compare unequal to itself.
    generatedAt: new Date(0).toISOString(),
    units,
  };
}
