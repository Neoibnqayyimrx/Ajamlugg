import {
  expandLessonSequence,
  gradeExercise,
  isSelfAssessed,
} from "../grading";
import {
  choiceExercise,
  lessonDoc,
  quizExercise,
  repeatExercise,
  textExercise,
} from "./fixtures";

describe("gradeExercise — choice", () => {
  it("accepts the correct option", () => {
    expect(
      gradeExercise(choiceExercise(), { kind: "choice", optionId: "opt-a" })
    ).toEqual({ correct: true, expected: "ا" });
  });

  it("rejects a wrong option but still reveals the expected answer", () => {
    const result = gradeExercise(choiceExercise(), {
      kind: "choice",
      optionId: "opt-b",
    });
    expect(result.correct).toBe(false);
    expect(result.expected).toBe("ا");
  });

  it("rejects an option id that is not in the list", () => {
    expect(
      gradeExercise(choiceExercise(), { kind: "choice", optionId: "nope" })
        .correct
    ).toBe(false);
  });

  it("leaves `expected` undefined when the correct option is audio-only", () => {
    const exercise = choiceExercise({
      response: {
        kind: "choice",
        options: [
          { id: "opt-a", audio: { url: "u", hash: "h", durationMs: 1 } },
          { id: "opt-b", audio: { url: "u2", hash: "h2", durationMs: 1 } },
        ],
        correctOptionId: "opt-a",
      },
    });
    expect(
      gradeExercise(exercise, { kind: "choice", optionId: "opt-a" }).expected
    ).toBeUndefined();
  });
});

describe("gradeExercise — text", () => {
  it("accepts the canonical answer", () => {
    expect(
      gradeExercise(textExercise(), { kind: "text", value: "father" }).correct
    ).toBe(true);
  });

  it("accepts an alternative spelling from the accepted list", () => {
    expect(
      gradeExercise(textExercise(), { kind: "text", value: "  DAD " }).correct
    ).toBe(true);
  });

  it("rejects a wrong answer and reports the canonical spelling", () => {
    const result = gradeExercise(textExercise(), {
      kind: "text",
      value: "mother",
    });
    expect(result).toEqual({ correct: false, expected: "father" });
  });

  it("rejects an empty submission", () => {
    expect(
      gradeExercise(textExercise(), { kind: "text", value: "" }).correct
    ).toBe(false);
  });

  it("honours a per-exercise matching policy", () => {
    const strict = textExercise({
      response: {
        kind: "text",
        acceptedAnswers: ["Father"],
        matching: { caseSensitive: true },
      },
    });
    expect(
      gradeExercise(strict, { kind: "text", value: "father" }).correct
    ).toBe(false);
    expect(
      gradeExercise(strict, { kind: "text", value: "Father" }).correct
    ).toBe(true);
  });
});

describe("gradeExercise — self-assessed", () => {
  it("is always correct", () => {
    expect(
      gradeExercise(repeatExercise(), { kind: "self-assessed" })
    ).toEqual({ correct: true });
  });

  it("is reported by isSelfAssessed", () => {
    expect(isSelfAssessed(repeatExercise())).toBe(true);
    expect(isSelfAssessed(choiceExercise())).toBe(false);
  });
});

describe("gradeExercise — misuse", () => {
  // These throw rather than scoring false: a mismatched answer shape is a bug
  // in the player, and silently marking the learner wrong would hide it.
  it("throws when the answer kind does not match the response kind", () => {
    expect(() =>
      gradeExercise(choiceExercise(), { kind: "text", value: "ا" })
    ).toThrow(/expects a choice answer/);

    expect(() =>
      gradeExercise(textExercise(), { kind: "choice", optionId: "opt-a" })
    ).toThrow(/expects a text answer/);

    expect(() =>
      gradeExercise(repeatExercise(), { kind: "text", value: "x" })
    ).toThrow(/expects a self-assessed answer/);
  });

  it("throws when asked to grade a quiz directly", () => {
    expect(() =>
      gradeExercise(quizExercise(), { kind: "choice", optionId: "x" })
    ).toThrow(/never graded directly/);
  });
});

describe("expandLessonSequence", () => {
  it("returns plain exercises unchanged, keyed by id", () => {
    const items = expandLessonSequence(lessonDoc());
    expect(items.map((i) => i.key)).toEqual(["ex-choice", "ex-text"]);
    expect(items.every((i) => i.quizId === undefined)).toBe(true);
  });

  it("replaces a quiz with the exercises it references", () => {
    const items = expandLessonSequence(
      lessonDoc({
        exercises: [choiceExercise(), textExercise(), quizExercise()],
      })
    );

    expect(items).toHaveLength(4);
    expect(items.map((i) => i.exercise.id)).toEqual([
      "ex-choice",
      "ex-text",
      "ex-choice",
      "ex-text",
    ]);
  });

  it("gives quiz items unique keys so a repeat is a separate position", () => {
    const items = expandLessonSequence(
      lessonDoc({
        exercises: [choiceExercise(), textExercise(), quizExercise()],
      })
    );
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    expect(items[2].key).toBe("ex-quiz:ex-choice");
    expect(items[2].quizId).toBe("ex-quiz");
  });

  it("skips references that do not resolve rather than throwing", () => {
    // A published document cannot contain one (the validator rejects it), but
    // a bad document reaching a device should degrade, not break the lesson.
    const items = expandLessonSequence(
      lessonDoc({
        exercises: [
          choiceExercise(),
          quizExercise({
            response: {
              kind: "composite",
              exerciseIds: ["ex-choice", "ex-missing"],
            },
          }),
        ],
      })
    );
    expect(items.map((i) => i.exercise.id)).toEqual(["ex-choice", "ex-choice"]);
  });

  it("never nests one quiz inside another", () => {
    const items = expandLessonSequence(
      lessonDoc({
        exercises: [
          choiceExercise(),
          quizExercise({ id: "quiz-1" }),
          quizExercise({
            id: "quiz-2",
            response: { kind: "composite", exerciseIds: ["quiz-1"] },
          }),
        ],
      })
    );
    expect(items.every((i) => i.exercise.response.kind !== "composite")).toBe(
      true
    );
  });
});
