/**
 * src/features/learning/validate.ts
 *
 * Runtime validation of a lesson document.
 *
 * This has two callers with the same needs from opposite directions:
 *
 *  1. The content pipeline, which must refuse to PUBLISH a malformed document
 *     — the point at which a human can still fix it.
 *  2. The client, which must refuse to RENDER one that arrived over the
 *     network. TypeScript types evaporate at runtime, so a `LessonDocument`
 *     annotation on a fetch response is a promise nobody checked.
 *
 * It therefore takes `unknown` and checks shape as well as meaning. That is
 * more code than a semantic-only validator, but a content backend where any
 * editor can publish is exactly the sort of boundary that deserves a real
 * guard: the failure it prevents is a learner opening a lesson that crashes.
 *
 * Every error is collected rather than thrown on the first problem — an author
 * fixing a document wants the whole list, not one item per save.
 */

import {
  CONTENT_SCHEMA_VERSION,
  type Exercise,
  type ExerciseType,
  type LessonDocument,
} from "@/types/content";

export type ValidationResult =
  | { ok: true; document: LessonDocument }
  | { ok: false; errors: string[] };

/**
 * Which response kinds each exercise type may use.
 *
 * This table is the reason the type/response split does not turn into an
 * anything-goes pairing. The type system cannot express "a `listening`
 * exercise may be answered by choice or by text but never self-assessed"
 * without an unwieldy union, so the constraint lives here, where it is also
 * enforceable against untrusted input.
 */
const LEGAL_RESPONSES: Readonly<Record<ExerciseType, readonly string[]>> = {
  "letter-recognition": ["choice"],
  "word-formation": ["choice", "text"],
  reading: ["choice", "text"],
  "listen-and-repeat": ["self-assessed"],
  listening: ["choice", "text"],
  translation: ["choice", "text"],
  "multiple-choice": ["choice"],
  "lesson-quiz": ["composite"],
};

/**
 * Types that are meaningless without a clip to play. `listening` is the whole
 * of this list: the exercise IS the audio, and without it there is nothing to
 * ask about.
 *
 * `listen-and-repeat` is deliberately absent. A reference recording is the
 * better version of that exercise, but "read this and say it aloud" is a
 * coherent one too — it is what the existing hand-written lessons do, and
 * requiring audio would have blocked migrating them. It must still present
 * SOMETHING, which is what REQUIRES_STEM_CONTENT below enforces.
 */
const REQUIRES_STEM_AUDIO: readonly ExerciseType[] = ["listening"];

/** Types that must show or play something, though either will do. */
const REQUIRES_STEM_CONTENT: readonly ExerciseType[] = ["listen-and-repeat"];

const MIN_CHOICE_OPTIONS = 2;
const MAX_CHOICE_OPTIONS = 4;

// ─── Shape helpers ────────────────────────────────────────────────────────────

type Record_ = Record<string, unknown>;

const isRecord = (value: unknown): value is Record_ =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

// ─── Media ────────────────────────────────────────────────────────────────────

function validateMedia(value: unknown, where: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${where}: media must be an object`);
    return;
  }
  if (!isNonEmptyString(value.url)) {
    errors.push(`${where}: media.url is required`);
  }
  // The hash is what makes the URL safe to cache forever and what the offline
  // cache keys on, so a document without one cannot participate in either.
  if (!isNonEmptyString(value.hash)) {
    errors.push(`${where}: media.hash is required`);
  }
  if (typeof value.durationMs !== "number" || value.durationMs <= 0) {
    errors.push(`${where}: media.durationMs must be a positive number`);
  }
}

// ─── Exercises ────────────────────────────────────────────────────────────────

function validateExercise(
  value: unknown,
  index: number,
  context: {
    /** Ids of exercises declared before this one, for quiz references. */
    precedingIds: Set<string>;
    vocabularyIds: Set<string>;
  },
  errors: string[]
): void {
  const where = `exercises[${index}]`;

  if (!isRecord(value)) {
    errors.push(`${where}: must be an object`);
    return;
  }

  if (!isNonEmptyString(value.id)) errors.push(`${where}: id is required`);
  if (!isNonEmptyString(value.prompt)) {
    errors.push(`${where}: prompt is required`);
  }

  const type = value.type;
  if (typeof type !== "string" || !(type in LEGAL_RESPONSES)) {
    errors.push(`${where}: unknown exercise type "${String(type)}"`);
    return; // Without a known type nothing below can be checked meaningfully.
  }
  const exerciseType = type as ExerciseType;

  // ── Stem ───────────────────────────────────────────────────────────────────
  const stem = value.stem;
  if (stem !== undefined) {
    if (!isRecord(stem)) {
      errors.push(`${where}: stem must be an object`);
    } else if (stem.audio !== undefined) {
      validateMedia(stem.audio, `${where}.stem.audio`, errors);
    }
  }

  if (REQUIRES_STEM_AUDIO.includes(exerciseType)) {
    const audio = isRecord(stem) ? stem.audio : undefined;
    if (audio === undefined) {
      errors.push(
        `${where}: a "${exerciseType}" exercise requires stem.audio — there is ` +
          `nothing for the learner to hear without it`
      );
    }
  }

  if (REQUIRES_STEM_CONTENT.includes(exerciseType)) {
    const hasText = isRecord(stem) && isNonEmptyString(stem.text);
    const hasAudio = isRecord(stem) && stem.audio !== undefined;
    if (!hasText && !hasAudio) {
      errors.push(
        `${where}: a "${exerciseType}" exercise needs stem.text or stem.audio — ` +
          `the learner has nothing to repeat otherwise`
      );
    }
  }

  // ── Response ───────────────────────────────────────────────────────────────
  const response = value.response;
  if (!isRecord(response)) {
    errors.push(`${where}: response is required`);
    return;
  }

  const kind = response.kind;
  if (typeof kind !== "string") {
    errors.push(`${where}: response.kind is required`);
    return;
  }

  if (!LEGAL_RESPONSES[exerciseType].includes(kind)) {
    errors.push(
      `${where}: a "${exerciseType}" exercise cannot use a "${kind}" response ` +
        `(allowed: ${LEGAL_RESPONSES[exerciseType].join(", ")})`
    );
    return;
  }

  switch (kind) {
    case "choice": {
      const options = response.options;
      if (!Array.isArray(options)) {
        errors.push(`${where}: response.options must be an array`);
        break;
      }
      if (
        options.length < MIN_CHOICE_OPTIONS ||
        options.length > MAX_CHOICE_OPTIONS
      ) {
        errors.push(
          `${where}: expected ${MIN_CHOICE_OPTIONS}-${MAX_CHOICE_OPTIONS} ` +
            `options, got ${options.length}`
        );
      }

      const optionIds: string[] = [];
      options.forEach((option, optionIndex) => {
        const optionWhere = `${where}.options[${optionIndex}]`;
        if (!isRecord(option)) {
          errors.push(`${optionWhere}: must be an object`);
          return;
        }
        if (!isNonEmptyString(option.id)) {
          errors.push(`${optionWhere}: id is required`);
        } else {
          optionIds.push(option.id);
        }
        // An option the learner can neither read nor hear is unanswerable.
        if (!isNonEmptyString(option.label) && option.audio === undefined) {
          errors.push(`${optionWhere}: needs a label or audio`);
        }
        if (option.audio !== undefined) {
          validateMedia(option.audio, `${optionWhere}.audio`, errors);
        }
      });

      for (const dupe of duplicates(optionIds)) {
        errors.push(`${where}: duplicate option id "${dupe}"`);
      }

      if (!isNonEmptyString(response.correctOptionId)) {
        errors.push(`${where}: response.correctOptionId is required`);
      } else if (!optionIds.includes(response.correctOptionId)) {
        errors.push(
          `${where}: correctOptionId "${response.correctOptionId}" is not one ` +
            `of the options`
        );
      }
      break;
    }

    case "text": {
      const accepted = response.acceptedAnswers;
      if (!Array.isArray(accepted) || accepted.length === 0) {
        errors.push(
          `${where}: response.acceptedAnswers must be a non-empty array — a ` +
            `text exercise with no accepted answer can never be passed`
        );
        break;
      }
      accepted.forEach((answer, answerIndex) => {
        if (!isNonEmptyString(answer)) {
          errors.push(
            `${where}.acceptedAnswers[${answerIndex}]: must be a non-empty string`
          );
        }
      });
      break;
    }

    case "self-assessed":
      break;

    case "composite": {
      const ids = response.exerciseIds;
      if (!Array.isArray(ids) || ids.length === 0) {
        errors.push(`${where}: a quiz must reference at least one exercise`);
        break;
      }
      const seen = new Set<string>();
      ids.forEach((id, idIndex) => {
        const idWhere = `${where}.exerciseIds[${idIndex}]`;
        if (!isNonEmptyString(id)) {
          errors.push(`${idWhere}: must be a non-empty string`);
          return;
        }
        if (seen.has(id)) {
          errors.push(`${idWhere}: "${id}" is referenced twice`);
        }
        seen.add(id);
        // "Preceding" rather than "anywhere in the document" because a quiz
        // is a review: referencing an exercise the learner has not reached
        // yet would test unseen material, and a quiz referencing a later quiz
        // could recurse.
        if (!context.precedingIds.has(id)) {
          errors.push(
            `${idWhere}: "${id}" is not an exercise defined earlier in this lesson`
          );
        }
      });
      break;
    }
  }

  // ── Vocabulary link ────────────────────────────────────────────────────────
  if (value.vocabularyId !== undefined) {
    if (!isNonEmptyString(value.vocabularyId)) {
      errors.push(`${where}: vocabularyId must be a non-empty string`);
    } else if (!context.vocabularyIds.has(value.vocabularyId)) {
      errors.push(
        `${where}: vocabularyId "${value.vocabularyId}" is not in this lesson's ` +
          `vocabulary`
      );
    }
  }
}

// ─── Document ─────────────────────────────────────────────────────────────────

/**
 * Validate an untrusted value as a publishable lesson document.
 *
 * On success the input is returned narrowed to `LessonDocument`, so callers
 * get a checked value rather than having to assert one.
 */
export function validateLessonDocument(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["document must be an object"] };
  }

  // Version first: on a mismatch every other message would be noise about a
  // shape this build was never meant to read.
  if (input.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `unsupported schemaVersion ${String(input.schemaVersion)} ` +
          `(this build reads version ${CONTENT_SCHEMA_VERSION})`,
      ],
    };
  }

  for (const field of [
    "id",
    "unitId",
    "languageId",
    "title",
    "description",
  ] as const) {
    if (!isNonEmptyString(input[field])) {
      errors.push(`${field} is required`);
    }
  }

  const stage = input.stage;
  if (typeof stage !== "number" || !Number.isInteger(stage) || stage < 1 || stage > 5) {
    errors.push(`stage must be an integer from 1 to 5, got ${String(stage)}`);
  }

  if (!Array.isArray(input.goals)) {
    errors.push("goals must be an array");
  }

  // ── Vocabulary ─────────────────────────────────────────────────────────────
  const vocabularyIds = new Set<string>();
  const vocabulary = input.vocabulary;
  if (!Array.isArray(vocabulary)) {
    errors.push("vocabulary must be an array");
  } else {
    const ids: string[] = [];
    vocabulary.forEach((entry, index) => {
      const where = `vocabulary[${index}]`;
      if (!isRecord(entry)) {
        errors.push(`${where}: must be an object`);
        return;
      }
      for (const field of ["id", "ajami", "transliteration", "translation"] as const) {
        if (!isNonEmptyString(entry[field])) {
          errors.push(`${where}: ${field} is required`);
        }
      }
      if (isNonEmptyString(entry.id)) {
        ids.push(entry.id);
        vocabularyIds.add(entry.id);
      }
      if (entry.audio !== undefined) {
        validateMedia(entry.audio, `${where}.audio`, errors);
      }
    });
    for (const dupe of duplicates(ids)) {
      errors.push(`duplicate vocabulary id "${dupe}"`);
    }
  }

  // ── Exercises ──────────────────────────────────────────────────────────────
  const exercises = input.exercises;
  if (!Array.isArray(exercises)) {
    errors.push("exercises must be an array");
    return { ok: false, errors };
  }
  if (exercises.length === 0) {
    errors.push("a lesson must have at least one exercise");
  }

  const precedingIds = new Set<string>();
  const exerciseIds: string[] = [];

  exercises.forEach((exercise, index) => {
    validateExercise(exercise, index, { precedingIds, vocabularyIds }, errors);
    if (isRecord(exercise) && isNonEmptyString(exercise.id)) {
      exerciseIds.push(exercise.id);
      precedingIds.add(exercise.id);
    }
  });

  for (const dupe of duplicates(exerciseIds)) {
    errors.push(`duplicate exercise id "${dupe}"`);
  }

  // ── Quiz placement ─────────────────────────────────────────────────────────
  // A quiz is by definition the end-of-lesson review, so allowing several, or
  // one in the middle, would mean the document said something the player has
  // no way to honour.
  const quizIndexes = exercises
    .map((exercise, index) =>
      isRecord(exercise) &&
      isRecord(exercise.response) &&
      exercise.response.kind === "composite"
        ? index
        : -1
    )
    .filter((index) => index >= 0);

  if (quizIndexes.length > 1) {
    errors.push(
      `a lesson may have at most one lesson-quiz, found ${quizIndexes.length}`
    );
  }
  if (quizIndexes.length === 1 && quizIndexes[0] !== exercises.length - 1) {
    errors.push("the lesson-quiz must be the last exercise in the lesson");
  }

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, document: input as unknown as LessonDocument };
}

/** Convenience guard for call sites that only care whether it parsed. */
export function isValidLessonDocument(
  input: unknown
): input is LessonDocument {
  return validateLessonDocument(input).ok;
}

/** Re-exported so callers can narrow an exercise without importing the types. */
export type { Exercise, LessonDocument };
