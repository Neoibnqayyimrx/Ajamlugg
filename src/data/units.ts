import { Unit } from "@/types/learning";

export const UNITS: Unit[] = [
  {
    id: "hausa-unit-1",
    languageId: "hausa-ajami",
    order: 1,
    title: "The Basics",
    description: "Learn your first Ajami letters and their sounds.",
    lessonIds: ["hausa-lesson-1-1", "hausa-lesson-1-2"],
  },
  {
    id: "hausa-unit-2",
    languageId: "hausa-ajami",
    order: 2,
    title: "Connecting Letters",
    description: "Learn how to connect letters to form simple words.",
    lessonIds: ["hausa-lesson-2-1"],
  },
];
