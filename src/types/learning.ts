/**
 * Core types for the Ajami learning system.
 */

export type LanguageId = "hausa-ajami" | "swahili-ajami" | "wolof-ajami";

export interface Language {
  id: LanguageId;
  name: string;
  /** Ajami/Arabic script character displayed as the language icon */
  script: string;
  /** Accent color for the language card */
  color: string;
  description: string;
}

export type ActivityType =
  | "letter-recognition"
  | "word-formation"
  | "reading"
  | "speaking";

export interface Vocabulary {
  id: string;
  ajami: string;
  transliteration: string;
  translation: string;
  audioUrl?: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  prompt: string;
  correctAnswer: string;
  options?: string[]; // For multiple choice
  vocabularyId?: string; // Link to the term being learned/tested
  vocabulary?: Vocabulary; // Embedded vocabulary info
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  description: string;
  stage: 1 | 2 | 3 | 4 | 5; // Corresponding to the 5 stages of learning
  goals: string[];
  aiTeacherPrompt: string; // Instructions for the Vision/Audio Agent on how to teach this lesson
  activities: Activity[];
}

export interface Unit {
  id: string;
  languageId: LanguageId;
  order: number;
  title: string;
  description: string;
  lessonIds: string[];
}
