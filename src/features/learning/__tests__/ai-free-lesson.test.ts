/**
 * The acceptance test for the whole refactor, in two halves.
 *
 *   1. BEHAVIOUR — a learner can complete Lesson 1 end to end with the AI
 *      environment variables absent and no network available. This replays
 *      exactly what the player screen does: expand the sequence, grade each
 *      answer, score the run.
 *
 *   2. REACHABILITY — no module reachable from the lesson player imports
 *      Gemini, the vision agent, or the Stream call SDK. This is the "verify
 *      by grep" criterion turned into something that fails CI, and it is
 *      stronger than stubbing the network: it proves the code is not there to
 *      be called, rather than that one run happened not to call it.
 */

// This test walks the source tree, so it needs the Node typings. They are
// pulled in here rather than added to tsconfig's `types` list, which is kept
// to ["jest"] on purpose: the app is React Native, and Node globals should not
// be in scope for application code that cannot use them.
/// <reference types="node" />
import fs from "fs";
import path from "path";

import { buildBundledDocuments } from "@/features/content/legacy-adapter";
import type { Exercise } from "@/types/content";

import {
  expandLessonSequence,
  gradeExercise,
  isSelfAssessed,
  type LearnerAnswer,
} from "../grading";
import { computeLessonScore, type Attempt } from "../scoring";

// ─── 1. Behaviour ─────────────────────────────────────────────────────────────

/** The answer a learner who knows the material would give. */
function correctAnswerFor(exercise: Exercise): LearnerAnswer {
  switch (exercise.response.kind) {
    case "choice":
      return { kind: "choice", optionId: exercise.response.correctOptionId };
    case "text":
      return { kind: "text", value: exercise.response.acceptedAnswers[0] };
    case "self-assessed":
      return { kind: "self-assessed" };
    case "composite":
      // expandLessonSequence flattens a quiz into the exercises it references,
      // so a composite never arrives as a playable item. Reaching this means
      // the expansion is broken, which is worth failing loudly over.
      throw new Error(`composite exercise ${exercise.id} was not expanded`);
  }
}

function runLesson(lessonId: string): Attempt[] {
  const document = buildBundledDocuments().get(lessonId);
  if (!document) throw new Error(`no such lesson: ${lessonId}`);

  return expandLessonSequence(document).map((item) => ({
    key: item.key,
    correctFirstTry: gradeExercise(item.exercise, correctAnswerFor(item.exercise))
      .correct,
    selfAssessed: isSelfAssessed(item.exercise),
    isQuizItem: item.quizId !== undefined,
  }));
}

describe("completing a lesson with no AI and no network", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // A fresh install with none of the AI configuration present.
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.VISION_AGENT_URL;
    delete process.env.VISION_AGENT_SECRET;
    delete process.env.EXPO_PUBLIC_STREAM_API_KEY;

    // Airplane mode. Any outbound request is a failure, not a fallback.
    globalThis.fetch = jest.fn(() => {
      throw new Error(
        "network called during a lesson — the AI-free path is broken"
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("plays Lesson 1 to completion and awards XP", () => {
    const attempts = runLesson("hausa-lesson-1-1");

    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts.every((a) => a.correctFirstTry)).toBe(true);

    const score = computeLessonScore(attempts);
    expect(score.perfect).toBe(true);
    expect(score.xp).toBeGreaterThan(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("plays every bundled lesson to completion", () => {
    for (const id of buildBundledDocuments().keys()) {
      const attempts = runLesson(id);

      // Reported as an object so a failure names the offending lesson.
      expect({ id, playable: attempts.length > 0 }).toEqual({
        id,
        playable: true,
      });
      expect({ id, allCorrect: attempts.every((a) => a.correctFirstTry) }).toEqual(
        { id, allCorrect: true }
      );
      expect(computeLessonScore(attempts).xp).toBeGreaterThan(0);
    }

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("still completes a lesson when every answer is wrong", () => {
    // Completion must not depend on being right — otherwise a struggling
    // learner is stuck with no way forward and no record of the attempt.
    const attempts = runLesson("hausa-lesson-1-1").map((attempt) => ({
      ...attempt,
      correctFirstTry: false,
    }));

    const score = computeLessonScore(attempts);
    expect(score.perfect).toBe(false);
    // The completion award still lands, so the lesson counts as done.
    expect(score.xp).toBeGreaterThan(0);
  });
});

// ─── 2. Reachability ──────────────────────────────────────────────────────────

// Resolved from the Jest working directory (the project root) rather than
// __dirname, which tsconfig's types:["jest"] deliberately leaves undeclared.
// The "actually walked the graph" test below fails loudly if this is wrong.
const SRC = path.resolve("src");

/**
 * Anything that would drag AI or a live call back into the lesson flow.
 *
 * `aiTeacherPrompt` is deliberately NOT here. The legacy adapter has to read
 * that field in order to rename it, so the identifier is legitimately on this
 * graph at the migration boundary (src/data, src/types/learning.ts and the
 * adapter itself). The invariant that actually matters — that no lesson
 * DOCUMENT carries the field and nothing renders it — is asserted in
 * legacy-adapter.test.ts, where it can be checked precisely rather than by
 * grepping for a string.
 */
const FORBIDDEN = [
  /\bgemini\b/i,
  /vision[-_]?agent/i,
  /@stream-io\//,
  /\bwarmAgentService\b/,
];

/** Resolve one import specifier to a file inside src/, or null if external. */
function resolveImport(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = path.join(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null; // node_modules — checked by name against FORBIDDEN instead
  }

  const candidates = [
    base + ".ts",
    base + ".tsx",
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/** Every first-party module reachable from `entry`, transitively. */
function reachableFrom(entry: string): Map<string, string> {
  const seen = new Map<string, string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;

    const source = fs.readFileSync(file, "utf8");
    seen.set(file, source);

    // Matches `import ... from "x"`, `export ... from "x"` and `import("x")`.
    const pattern = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      const resolved = resolveImport(file, specifier);
      if (resolved) {
        queue.push(resolved);
      } else {
        // An external package. Its NAME still has to be clean.
        for (const forbidden of FORBIDDEN) {
          if (forbidden.test(specifier)) {
            throw new Error(
              path.relative(SRC, file) +
                ' imports "' +
                specifier +
                '", which is not allowed on the lesson path'
            );
          }
        }
      }
    }
  }

  return seen;
}

/**
 * The screens a learner passes through by default: home -> lesson list ->
 * player. The AI teacher screens are NOT here, which is the point — they are
 * still in the repo and still reachable by deep link, just not from this path.
 */
const DEFAULT_FLOW = [
  path.join(SRC, "app", "(home)", "index.tsx"),
  path.join(SRC, "app", "(home)", "learn.tsx"),
  path.join(SRC, "app", "(home)", "lesson.tsx"),
];

describe("the default lesson flow's import graph", () => {
  const entry = path.join(SRC, "app", "(home)", "lesson.tsx");

  it("has every screen of the flow where the router expects it", () => {
    for (const screen of DEFAULT_FLOW) {
      expect({ screen, exists: fs.existsSync(screen) }).toEqual({
        screen,
        exists: true,
      });
    }
  });

  it("routes no screen in the flow to the AI teacher", () => {
    for (const screen of DEFAULT_FLOW) {
      const source = fs.readFileSync(screen, "utf8");
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

      // A router.push to either AI screen would put it back on the path.
      expect({
        screen: path.relative(SRC, screen),
        pushesToAi: /["'][^"']*(?:audio-lesson|ai-teacher)["']/.test(code),
      }).toEqual({ screen: path.relative(SRC, screen), pushesToAi: false });
    }
  });

  it("reaches no Gemini, vision-agent or Stream-call code", () => {
    const modules = new Map<string, string>();
    for (const screen of DEFAULT_FLOW) {
      for (const [file, source] of reachableFrom(screen)) {
        modules.set(file, source);
      }
    }

    const offenders: string[] = [];
    for (const [file, source] of modules) {
      // Strip comments before matching: the modules on this path carry
      // explanatory notes about the AI code they no longer use, and those
      // notes are not calls.
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

      for (const forbidden of FORBIDDEN) {
        if (forbidden.test(code)) {
          offenders.push(path.relative(SRC, file) + " matches " + forbidden);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("actually walked the graph, so a passing result means something", () => {
    const modules = reachableFrom(entry);
    const names = [...modules.keys()].map((f) => path.relative(SRC, f));

    // Guards against resolveImport quietly returning null for everything and
    // the test above passing vacuously.
    expect(names.length).toBeGreaterThan(5);
    expect(names.some((n) => n.includes("grading"))).toBe(true);
    expect(names.some((n) => n.includes("repository"))).toBe(true);
  });
});
