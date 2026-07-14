/**
 * app/api/lessons/[lessonId]+api.ts
 *
 * Server-only route: serves the static lesson content (title, goals,
 * `aiTeacherPrompt`, vocabulary) bundled in src/data/* as JSON, keyed by
 * lessonId. This is the only place lesson content is reachable outside the
 * app bundle — the Audio Lesson teacher agent (vision-agent/) calls this to
 * learn what it's teaching instead of hardcoding lesson content.
 *
 * GET /api/lessons/:lessonId
 */

import { LANGUAGES } from "@/data/languages";
import { LESSONS } from "@/data/lessons";
import { UNITS } from "@/data/units";

export function GET(_request: Request, { lessonId }: { lessonId: string }) {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  const unit = UNITS.find((u) => u.id === lesson.unitId);
  const language = unit ? LANGUAGES.find((l) => l.id === unit.languageId) : undefined;

  return Response.json({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    stage: lesson.stage,
    goals: lesson.goals,
    aiTeacherPrompt: lesson.aiTeacherPrompt,
    activities: lesson.activities,
    languageId: unit?.languageId ?? null,
    languageName: language?.name ?? null,
  });
}
