/**
 * Fixture builders for lesson-content tests.
 *
 * Each builder produces a VALID value and takes overrides, so a test that is
 * about one broken field says only that:
 *
 *     lessonDoc({ exercises: [choiceExercise({ id: "" })] })
 *
 * The alternative — a literal document per test — buries the thing under test
 * in forty lines of boilerplate and rots the moment the schema gains a field.
 */

import {
  CONTENT_SCHEMA_VERSION,
  type Exercise,
  type LessonDocument,
  type MediaRef,
  type VocabularyEntry,
} from "@/types/content";

export function media(overrides: Partial<MediaRef> = {}): MediaRef {
  return {
    url: "https://cdn.example.test/audio/abc123.mp3",
    hash: "abc123",
    durationMs: 1200,
    bytes: 9600,
    ...overrides,
  };
}

export function vocab(
  overrides: Partial<VocabularyEntry> = {}
): VocabularyEntry {
  return {
    id: "voc-baba",
    ajami: "بابا",
    transliteration: "baba",
    translation: "father",
    ...overrides,
  };
}

export function choiceExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-choice",
    type: "letter-recognition",
    prompt: "Which letter makes the 'A' sound?",
    response: {
      kind: "choice",
      options: [
        { id: "opt-a", label: "ا" },
        { id: "opt-b", label: "ب" },
        { id: "opt-c", label: "ت" },
      ],
      correctOptionId: "opt-a",
    },
    ...overrides,
  };
}

export function textExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-text",
    type: "translation",
    prompt: "Translate to English: بابا",
    stem: { text: "بابا" },
    response: {
      kind: "text",
      acceptedAnswers: ["father", "dad"],
    },
    ...overrides,
  };
}

export function listeningExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-listening",
    type: "listening",
    prompt: "What did you hear?",
    stem: { audio: media() },
    response: {
      kind: "choice",
      options: [
        { id: "opt-baba", label: "baba" },
        { id: "opt-mama", label: "mama" },
      ],
      correctOptionId: "opt-baba",
    },
    ...overrides,
  };
}

export function repeatExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-repeat",
    type: "listen-and-repeat",
    prompt: "Say it back",
    stem: { audio: media({ hash: "def456" }) },
    response: { kind: "self-assessed" },
    ...overrides,
  };
}

export function quizExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-quiz",
    type: "lesson-quiz",
    prompt: "Review",
    response: {
      kind: "composite",
      exerciseIds: ["ex-choice", "ex-text"],
    },
    ...overrides,
  };
}

export function lessonDoc(
  overrides: Partial<LessonDocument> = {}
): LessonDocument {
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    id: "hausa-lesson-1-1",
    unitId: "hausa-unit-1",
    languageId: "hausa-ajami",
    title: "The First Three Letters",
    description: "Learn Alif, Ba and Ta.",
    stage: 1,
    goals: ["Recognize Alif"],
    vocabulary: [vocab()],
    exercises: [choiceExercise(), textExercise()],
    ...overrides,
  };
}
