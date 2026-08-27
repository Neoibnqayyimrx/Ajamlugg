/**
 * The load-bearing test in this file is "every legacy lesson converts to a
 * VALID document". It runs the real src/data content through the real
 * converter and the real Phase 1 validator, so a mapping mistake fails CI
 * rather than shipping a lesson that cannot be rendered.
 */

import { LESSONS } from "@/data/lessons";
import { UNITS } from "@/data/units";
import { validateLessonDocument } from "@/features/learning/validate";
import { expandLessonSequence } from "@/features/learning/grading";

import {
  BUNDLED_LESSON_VERSION,
  buildBundledDocuments,
  buildBundledManifest,
} from "../legacy-adapter";

const documents = buildBundledDocuments();

describe("buildBundledDocuments", () => {
  it("converts every legacy lesson", () => {
    expect(documents.size).toBe(LESSONS.length);
    for (const lesson of LESSONS) {
      expect(documents.has(lesson.id)).toBe(true);
    }
  });

  // The whole point of the exercise: real content, real validator.
  it.each([...documents.keys()])("produces a valid document for %s", (id) => {
    const result = validateLessonDocument(documents.get(id));
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("every document is playable — the sequence is never empty", () => {
    for (const document of documents.values()) {
      expect(expandLessonSequence(document).length).toBeGreaterThan(0);
    }
  });

  it("tags each lesson with the language of its unit", () => {
    const unitLanguage = new Map(UNITS.map((u) => [u.id, u.languageId]));
    for (const document of documents.values()) {
      expect(document.languageId).toBe(unitLanguage.get(document.unitId));
    }
  });
});

describe("exercise conversion", () => {
  it("turns a legacy multiple-choice activity into a choice response", () => {
    // hausa-lesson-1-1 / act-1: "Which letter makes the 'A' sound?"
    const document = documents.get("hausa-lesson-1-1");
    const exercise = document?.exercises.find((e) => e.id === "act-1");

    expect(exercise?.type).toBe("letter-recognition");

    const response = exercise?.response;
    expect(response?.kind).toBe("choice");
    if (response?.kind === "choice") {
      expect(response.options).toHaveLength(3);
      const correct = response.options.find(
        (o) => o.id === response.correctOptionId
      );
      expect(correct?.label).toBe("ا");
    }
  });

  it("turns a legacy speaking activity into self-assessed listen-and-repeat", () => {
    // hausa-lesson-1-2 is entirely speaking activities — the lesson that would
    // have been emptied by dropping the type outright.
    const document = documents.get("hausa-lesson-1-2");
    expect(document?.exercises.length).toBeGreaterThan(0);

    for (const exercise of document?.exercises ?? []) {
      expect(exercise.type).toBe("listen-and-repeat");
      expect(exercise.response.kind).toBe("self-assessed");
      // No recordings exist yet, so these must carry their subject as text.
      expect(exercise.stem?.text).toBeTruthy();
    }
  });

  it("splits an embedded subject out of the prompt", () => {
    // Legacy: "Pronounce this letter: ب"
    const exercise = documents
      .get("hausa-lesson-1-2")
      ?.exercises.find((e) => e.id === "act-4");

    expect(exercise?.prompt).toBe("Pronounce this letter");
    expect(exercise?.stem?.text).toBe("ب");
  });

  it("gives options positional ids so a repeated glyph stays unambiguous", () => {
    for (const document of documents.values()) {
      for (const exercise of document.exercises) {
        if (exercise.response.kind !== "choice") continue;
        const ids = exercise.response.options.map((o) => o.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it("always offers the correct answer among the options", () => {
    for (const document of documents.values()) {
      for (const exercise of document.exercises) {
        if (exercise.response.kind !== "choice") continue;
        const ids = exercise.response.options.map((o) => o.id);
        expect(ids).toContain(exercise.response.correctOptionId);
      }
    }
  });
});

describe("vocabulary", () => {
  // Legacy lesson 1-2 references "voc-ba", which lesson 1-1 defines. A
  // document that fetches and caches as one unit cannot depend on another
  // lesson being present, so the entry is copied in.
  it("copies in vocabulary referenced across lesson boundaries", () => {
    const document = documents.get("hausa-lesson-1-2");
    expect(document?.vocabulary.map((v) => v.id)).toContain("voc-ba");
  });

  it("leaves no dangling vocabulary references", () => {
    for (const document of documents.values()) {
      const ids = new Set(document.vocabulary.map((v) => v.id));
      for (const exercise of document.exercises) {
        if (exercise.vocabularyId !== undefined) {
          expect(ids).toContain(exercise.vocabularyId);
        }
      }
    }
  });
});

describe("authoring notes", () => {
  it("carries the old aiTeacherPrompt across as authoringNotes", () => {
    const document = documents.get("hausa-lesson-1-1");
    expect(document?.authoringNotes).toContain("Alif");
  });

  // The field is editorial metadata. Nothing the learner sees may come from
  // it, and no model is ever handed it.
  it("has no aiTeacherPrompt field left on the document", () => {
    for (const document of documents.values()) {
      expect(document).not.toHaveProperty("aiTeacherPrompt");
    }
  });
});

describe("buildBundledManifest", () => {
  it("lists a language's units in order with their lessons", () => {
    const manifest = buildBundledManifest("hausa-ajami");

    expect(manifest.languageId).toBe("hausa-ajami");
    expect(manifest.units.map((u) => u.order)).toEqual([1, 2]);
    expect(manifest.units[0].lessons).toHaveLength(6);
    expect(manifest.units[1].lessons).toHaveLength(2);
  });

  it("stamps every bundled lesson with version 1", () => {
    for (const unit of buildBundledManifest("hausa-ajami").units) {
      for (const lesson of unit.lessons) {
        expect(lesson.version).toBe(BUNDLED_LESSON_VERSION);
      }
    }
  });

  it("declares no media, since the bundled lessons have no recordings", () => {
    for (const unit of buildBundledManifest("hausa-ajami").units) {
      for (const lesson of unit.lessons) {
        expect(lesson.media).toEqual([]);
      }
    }
  });

  // A Date.now() here would make every snapshot unequal to itself and defeat
  // the manifest diffing this shape exists to support.
  it("is deterministic across calls", () => {
    expect(buildBundledManifest("hausa-ajami")).toEqual(
      buildBundledManifest("hausa-ajami")
    );
  });

  it("returns an empty unit list for a language with no content", () => {
    expect(buildBundledManifest("fulfulde-ajami").units).toEqual([]);
  });

  it("covers every language that has units, with no client change needed", () => {
    for (const languageId of new Set(UNITS.map((u) => u.languageId))) {
      expect(buildBundledManifest(languageId).units.length).toBeGreaterThan(0);
    }
  });
});
