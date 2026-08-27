/**
 * The repository is the seam Phase 4 will put a cache and a network sync
 * behind. These tests pin the contract that seam has to keep: async, ordered,
 * null-not-throw on a missing lesson, and language-scoped.
 */

import { validateLessonDocument } from "@/features/learning/validate";

import {
  __resetContentCache,
  getLessonDocument,
  getManifest,
  getUnitLessons,
  getUnits,
} from "../repository";

beforeEach(() => {
  __resetContentCache();
});

describe("getManifest", () => {
  it("returns the requested language's tree", async () => {
    const manifest = await getManifest("hausa-ajami");
    expect(manifest.languageId).toBe("hausa-ajami");
    expect(manifest.units.length).toBeGreaterThan(0);
  });

  it("scopes strictly to one language", async () => {
    const swahili = await getManifest("swahili-ajami");
    for (const unit of swahili.units) {
      expect(unit.id.startsWith("swahili")).toBe(true);
    }
  });
});

describe("getUnits", () => {
  it("returns units in order", async () => {
    const units = await getUnits("hausa-ajami");
    const orders = units.map((u) => u.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("returns an empty list for a language with no content yet", async () => {
    // Adding a language must be a content task, not a code change: an
    // unknown-but-typed language returns empty rather than throwing.
    expect(await getUnits("fulfulde-ajami")).toEqual([]);
  });
});

describe("getLessonDocument", () => {
  it("returns a valid document for a known lesson", async () => {
    const document = await getLessonDocument("hausa-lesson-1-1");
    expect(document).not.toBeNull();
    expect(validateLessonDocument(document).ok).toBe(true);
  });

  // A lesson id can go stale in a deep link or in a progress record that
  // outlived a content change. The screen shows "unavailable"; it must not
  // crash.
  it("returns null for an unknown lesson rather than throwing", async () => {
    expect(await getLessonDocument("no-such-lesson")).toBeNull();
    expect(await getLessonDocument("")).toBeNull();
  });
});

describe("getUnitLessons", () => {
  it("returns every lesson of a unit in the unit's order", async () => {
    const [unit] = await getUnits("hausa-ajami");
    const lessons = await getUnitLessons("hausa-ajami", unit.id);

    expect(lessons.map((l) => l.id)).toEqual(unit.lessons.map((l) => l.id));
  });

  it("returns an empty list for an unknown unit", async () => {
    expect(await getUnitLessons("hausa-ajami", "no-such-unit")).toEqual([]);
  });
});

describe("memoisation", () => {
  it("hands back the same document instance on repeated reads", async () => {
    const first = await getLessonDocument("hausa-lesson-1-1");
    const second = await getLessonDocument("hausa-lesson-1-1");
    expect(first).toBe(second);
  });

  it("rebuilds after a reset", async () => {
    const first = await getLessonDocument("hausa-lesson-1-1");
    __resetContentCache();
    const second = await getLessonDocument("hausa-lesson-1-1");

    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});
