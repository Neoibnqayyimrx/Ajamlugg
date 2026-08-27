/**
 * src/features/content/repository.ts
 *
 * The app's single door onto lesson content. Every screen goes through here;
 * nothing imports src/data directly any more.
 *
 * ─── Why these functions are async today, when nothing awaits ────────────────
 * Right now every answer comes from the bundled snapshot and is available
 * synchronously. They return promises anyway, because in Phase 4 the real
 * lookup order becomes:
 *
 *     local cache  ->  network (manifest diff)  ->  bundled snapshot
 *
 * and the middle step cannot be synchronous. Making the seam async now means
 * Phase 4 changes this file only. Had the player been written against
 * synchronous getters, adding the cache would have meant rewriting every
 * screen that reads content — the exact refactor this indirection exists to
 * avoid.
 *
 * ─── On keeping src/data ─────────────────────────────────────────────────────
 * The brief asked for a decision: KEEP the bundled snapshot, do not delete it
 * once sync lands.
 *
 * It costs a few KB of bundle and buys the cold-start case outright — a fresh
 * install on a bad connection opens Lesson 1 immediately instead of showing a
 * spinner against a manifest fetch. It is also the last line of the AI-free
 * guarantee: if the content backend is unreachable for any reason, the app
 * still has lessons. Content that ships with the binary cannot fail to load.
 *
 * The cost is that src/data must stay accurate, which the adapter's tests
 * enforce.
 */

import type {
  ContentManifest,
  LanguageId,
  LessonDocument,
  ManifestUnit,
} from "@/types/content";

import { buildBundledDocuments, buildBundledManifest } from "./legacy-adapter";

/**
 * Built once on first use rather than at module load, so importing this file
 * — which the router does eagerly for every screen — does not convert twenty
 * lessons before the first frame is drawn.
 */
let bundledDocuments: Map<string, LessonDocument> | undefined;

function documents(): Map<string, LessonDocument> {
  bundledDocuments ??= buildBundledDocuments();
  return bundledDocuments;
}

/** The unit/lesson tree for one language. */
export async function getManifest(
  languageId: LanguageId
): Promise<ContentManifest> {
  return buildBundledManifest(languageId);
}

/** The units of one language, in order. */
export async function getUnits(
  languageId: LanguageId
): Promise<ManifestUnit[]> {
  const manifest = await getManifest(languageId);
  return manifest.units;
}

/**
 * One lesson's full document, or null if there is no such lesson.
 *
 * Null rather than a throw: a lesson id can go stale in a deep link or in a
 * progress record that outlived a content change, and the caller showing "this
 * lesson is unavailable" is a better outcome than a crash.
 */
export async function getLessonDocument(
  lessonId: string
): Promise<LessonDocument | null> {
  return documents().get(lessonId) ?? null;
}

/**
 * Every lesson document in a unit, in the unit's order.
 *
 * This is what a "download this unit for offline use" action will call in
 * Phase 4, which is why it is a unit-level operation rather than something the
 * caller assembles from repeated single-lesson lookups.
 */
export async function getUnitLessons(
  languageId: LanguageId,
  unitId: string
): Promise<LessonDocument[]> {
  const units = await getUnits(languageId);
  const unit = units.find((u) => u.id === unitId);
  if (!unit) return [];

  const lessons = await Promise.all(
    unit.lessons.map((lesson) => getLessonDocument(lesson.id))
  );
  return lessons.filter((lesson): lesson is LessonDocument => lesson !== null);
}

/** Test seam: drops the memoised snapshot so a test can rebuild it. */
export function __resetContentCache(): void {
  bundledDocuments = undefined;
}
