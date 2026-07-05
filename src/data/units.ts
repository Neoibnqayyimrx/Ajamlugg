import { Unit } from "@/types/learning";

export const UNITS: Unit[] = [
  // ─── Hausa Ajami ────────────────────────────────────────────────────────────
  {
    id: "hausa-unit-1",
    languageId: "hausa-ajami",
    order: 1,
    title: "The Basics",
    description: "Learn your first Ajami letters and their sounds.",
    lessonIds: [
      "hausa-lesson-1-1",
      "hausa-lesson-1-2",
      "hausa-lesson-1-3",
      "hausa-lesson-1-4",
      "hausa-lesson-1-5",
      "hausa-lesson-1-6",
    ],
  },
  {
    id: "hausa-unit-2",
    languageId: "hausa-ajami",
    order: 2,
    title: "Connecting Letters",
    description: "Learn how to connect letters to form simple words.",
    lessonIds: ["hausa-lesson-2-1", "hausa-lesson-2-2"],
  },

  // ─── Swahili Ajami ──────────────────────────────────────────────────────────
  {
    id: "swahili-unit-1",
    languageId: "swahili-ajami",
    order: 1,
    title: "The Basics",
    description: "Learn your first Swahili Ajami letters and read your first words.",
    lessonIds: [
      "swahili-lesson-1-1",
      "swahili-lesson-1-2",
      "swahili-lesson-1-3",
      "swahili-lesson-1-4",
      "swahili-lesson-1-5",
      "swahili-lesson-1-6",
    ],
  },

  // ─── Wolofal (Wolof Ajami) ──────────────────────────────────────────────────
  {
    id: "wolof-unit-1",
    languageId: "wolof-ajami",
    order: 1,
    title: "The Basics",
    description: "Learn your first Wolofal letters and read your first words.",
    lessonIds: [
      "wolof-lesson-1-1",
      "wolof-lesson-1-2",
      "wolof-lesson-1-3",
      "wolof-lesson-1-4",
      "wolof-lesson-1-5",
      "wolof-lesson-1-6",
    ],
  },
];
