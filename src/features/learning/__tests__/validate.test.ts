import { CONTENT_SCHEMA_VERSION } from "@/types/content";

import { isValidLessonDocument, validateLessonDocument } from "../validate";
import {
  choiceExercise,
  lessonDoc,
  listeningExercise,
  media,
  quizExercise,
  repeatExercise,
  textExercise,
  vocab,
} from "./fixtures";

/** Assert the document is rejected, and that some error mentions `pattern`. */
function expectRejected(input: unknown, pattern: RegExp): string[] {
  const result = validateLessonDocument(input);
  expect(result.ok).toBe(false);
  const errors = result.ok ? [] : result.errors;
  expect(errors.join("\n")).toMatch(pattern);
  return errors;
}

describe("validateLessonDocument — accepts valid documents", () => {
  it("accepts the baseline document and narrows it", () => {
    const result = validateLessonDocument(lessonDoc());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.id).toBe("hausa-lesson-1-1");
  });

  it("accepts every exercise type in one lesson", () => {
    const result = validateLessonDocument(
      lessonDoc({
        exercises: [
          choiceExercise(),
          textExercise(),
          listeningExercise(),
          repeatExercise(),
          quizExercise({
            response: {
              kind: "composite",
              exerciseIds: ["ex-choice", "ex-text", "ex-listening"],
            },
          }),
        ],
      })
    );
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("exposes a boolean guard", () => {
    expect(isValidLessonDocument(lessonDoc())).toBe(true);
    expect(isValidLessonDocument({})).toBe(false);
  });
});

describe("validateLessonDocument — untrusted input", () => {
  it.each([null, undefined, 42, "a string", []])(
    "rejects non-object input: %p",
    (input) => {
      expect(validateLessonDocument(input).ok).toBe(false);
    }
  );

  it("rejects a schemaVersion this build cannot read, without further noise", () => {
    const errors = expectRejected(
      lessonDoc({ schemaVersion: CONTENT_SCHEMA_VERSION + 1 }),
      /unsupported schemaVersion/
    );
    // Version failure short-circuits: reporting field errors against a shape
    // we were never meant to parse would be misleading.
    expect(errors).toHaveLength(1);
  });

  it("rejects missing top-level fields", () => {
    expectRejected(lessonDoc({ title: "" }), /title is required/);
    expectRejected(lessonDoc({ languageId: "" as never }), /languageId is required/);
  });

  it("rejects an out-of-range stage", () => {
    expectRejected(lessonDoc({ stage: 9 as never }), /stage must be an integer/);
  });

  it("rejects a lesson with no exercises", () => {
    expectRejected(lessonDoc({ exercises: [] }), /at least one exercise/);
  });

  it("rejects duplicate exercise ids", () => {
    expectRejected(
      lessonDoc({ exercises: [choiceExercise(), choiceExercise()] }),
      /duplicate exercise id "ex-choice"/
    );
  });

  it("rejects an unknown exercise type", () => {
    expectRejected(
      lessonDoc({ exercises: [choiceExercise({ type: "singing" as never })] }),
      /unknown exercise type "singing"/
    );
  });
});

describe("validateLessonDocument — type/response pairings", () => {
  it("rejects a listening exercise that is self-assessed", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          listeningExercise({ response: { kind: "self-assessed" } }),
        ],
      }),
      /cannot use a "self-assessed" response/
    );
  });

  it("rejects a letter-recognition exercise answered by text", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise({
            response: { kind: "text", acceptedAnswers: ["a"] },
          }),
        ],
      }),
      /cannot use a "text" response/
    );
  });

  it("requires audio on a listening exercise, which is nothing without it", () => {
    expectRejected(
      lessonDoc({ exercises: [listeningExercise({ stem: undefined })] }),
      /requires stem\.audio/
    );
  });

  // A reference clip is the better version of listen-and-repeat, but "read
  // this and say it aloud" is a real exercise too — and it is what the
  // hand-written lessons being migrated actually do.
  it("accepts a listen-and-repeat exercise with text but no audio", () => {
    const result = validateLessonDocument(
      lessonDoc({
        exercises: [repeatExercise({ stem: { text: "بُ" } })],
      })
    );
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("rejects a listen-and-repeat exercise with nothing to repeat", () => {
    expectRejected(
      lessonDoc({ exercises: [repeatExercise({ stem: undefined })] }),
      /needs stem\.text or stem\.audio/
    );
    expectRejected(
      lessonDoc({ exercises: [repeatExercise({ stem: { text: "  " } })] }),
      /needs stem\.text or stem\.audio/
    );
  });
});

describe("validateLessonDocument — choice responses", () => {
  it("rejects fewer than two options", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise({
            response: {
              kind: "choice",
              options: [{ id: "opt-a", label: "ا" }],
              correctOptionId: "opt-a",
            },
          }),
        ],
      }),
      /expected 2-4 options, got 1/
    );
  });

  it("rejects more than four options", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise({
            response: {
              kind: "choice",
              options: [1, 2, 3, 4, 5].map((n) => ({
                id: `opt-${n}`,
                label: `${n}`,
              })),
              correctOptionId: "opt-1",
            },
          }),
        ],
      }),
      /expected 2-4 options, got 5/
    );
  });

  // The failure this prevents: an exercise nobody can ever answer correctly.
  it("rejects a correctOptionId that is not among the options", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise({
            response: {
              kind: "choice",
              options: [
                { id: "opt-a", label: "ا" },
                { id: "opt-b", label: "ب" },
              ],
              correctOptionId: "opt-z",
            },
          }),
        ],
      }),
      /correctOptionId "opt-z" is not one of the options/
    );
  });

  it("rejects duplicate option ids", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise({
            response: {
              kind: "choice",
              options: [
                { id: "opt-a", label: "ا" },
                { id: "opt-a", label: "ب" },
              ],
              correctOptionId: "opt-a",
            },
          }),
        ],
      }),
      /duplicate option id "opt-a"/
    );
  });

  it("rejects an option with neither label nor audio", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise({
            response: {
              kind: "choice",
              options: [{ id: "opt-a" }, { id: "opt-b", label: "ب" }],
              correctOptionId: "opt-b",
            },
          }),
        ],
      }),
      /needs a label or audio/
    );
  });
});

describe("validateLessonDocument — text responses", () => {
  it("rejects an empty accepted-answers list", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          textExercise({ response: { kind: "text", acceptedAnswers: [] } }),
        ],
      }),
      /can never be passed/
    );
  });

  it("rejects a blank accepted answer", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          textExercise({
            response: { kind: "text", acceptedAnswers: ["father", "  "] },
          }),
        ],
      }),
      /acceptedAnswers\[1\]/
    );
  });
});

describe("validateLessonDocument — quizzes", () => {
  it("rejects a quiz referencing an exercise defined later", () => {
    // A quiz is a review; referencing unseen material would test what was
    // never taught, and referencing a later quiz could recurse.
    expectRejected(
      lessonDoc({
        exercises: [
          quizExercise({
            response: { kind: "composite", exerciseIds: ["ex-choice"] },
          }),
          choiceExercise(),
        ],
      }),
      /not an exercise defined earlier/
    );
  });

  it("rejects a quiz referencing an id that does not exist", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise(),
          quizExercise({
            response: { kind: "composite", exerciseIds: ["ghost"] },
          }),
        ],
      }),
      /"ghost" is not an exercise defined earlier/
    );
  });

  it("rejects an empty quiz", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise(),
          quizExercise({ response: { kind: "composite", exerciseIds: [] } }),
        ],
      }),
      /must reference at least one exercise/
    );
  });

  it("rejects a repeated reference within one quiz", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise(),
          quizExercise({
            response: {
              kind: "composite",
              exerciseIds: ["ex-choice", "ex-choice"],
            },
          }),
        ],
      }),
      /referenced twice/
    );
  });

  it("rejects a quiz that is not the last exercise", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise(),
          quizExercise({
            response: { kind: "composite", exerciseIds: ["ex-choice"] },
          }),
          textExercise(),
        ],
      }),
      /must be the last exercise/
    );
  });

  it("rejects more than one quiz", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          choiceExercise(),
          quizExercise({
            id: "quiz-1",
            response: { kind: "composite", exerciseIds: ["ex-choice"] },
          }),
          quizExercise({
            id: "quiz-2",
            response: { kind: "composite", exerciseIds: ["ex-choice"] },
          }),
        ],
      }),
      /at most one lesson-quiz/
    );
  });
});

describe("validateLessonDocument — media and vocabulary", () => {
  it("rejects media without the hash the cache keys on", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          listeningExercise({ stem: { audio: media({ hash: "" }) } }),
        ],
      }),
      /media\.hash is required/
    );
  });

  it("rejects media with a non-positive duration", () => {
    expectRejected(
      lessonDoc({
        exercises: [
          listeningExercise({ stem: { audio: media({ durationMs: 0 }) } }),
        ],
      }),
      /durationMs must be a positive number/
    );
  });

  it("rejects a vocabularyId that does not resolve", () => {
    expectRejected(
      lessonDoc({
        exercises: [choiceExercise({ vocabularyId: "voc-missing" })],
      }),
      /"voc-missing" is not in this lesson's vocabulary/
    );
  });

  it("accepts a vocabularyId that does resolve", () => {
    const result = validateLessonDocument(
      lessonDoc({
        vocabulary: [vocab({ id: "voc-baba" })],
        exercises: [choiceExercise({ vocabularyId: "voc-baba" })],
      })
    );
    expect(result.ok).toBe(true);
  });

  it("rejects duplicate vocabulary ids", () => {
    expectRejected(
      lessonDoc({ vocabulary: [vocab(), vocab()] }),
      /duplicate vocabulary id/
    );
  });
});

describe("validateLessonDocument — error reporting", () => {
  it("collects every error rather than stopping at the first", () => {
    const result = validateLessonDocument(
      lessonDoc({
        title: "",
        description: "",
        stage: 0 as never,
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("points at the offending exercise by index", () => {
    expectRejected(
      lessonDoc({
        exercises: [choiceExercise(), textExercise({ prompt: "" })],
      }),
      /exercises\[1\]: prompt is required/
    );
  });
});
