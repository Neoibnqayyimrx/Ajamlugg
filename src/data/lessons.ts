import { Lesson } from "@/types/learning";

export const LESSONS: Lesson[] = [
  {
    id: "hausa-lesson-1-1",
    unitId: "hausa-unit-1",
    title: "The First Three Letters",
    description: "Learn to recognize Alif, Ba, and Ta in their isolated forms.",
    stage: 1,
    goals: [
      "Recognize the letter Alif (ا)",
      "Recognize the letter Ba (ب)",
      "Recognize the letter Ta (ت)",
    ],
    aiTeacherPrompt:
      "You are a supportive Ajami tutor teaching a beginner Hausa Ajami. Focus on the sounds 'A' (Alif), 'Ba' (Ba), and 'Ta' (Ta). If the user mispronounces, gently correct them by comparing the sound to English equivalents (like 'a' in 'apple', 'b' in 'bat', 't' in 'tap'). Keep instructions brief and encouraging.",
    activities: [
      {
        id: "act-1",
        type: "letter-recognition",
        prompt: "Which letter makes the 'A' sound?",
        correctAnswer: "ا",
        options: ["ا", "ب", "ت"],
        vocabulary: {
          id: "voc-alif",
          ajami: "ا",
          transliteration: "Alif",
          translation: "'A' sound",
        },
      },
      {
        id: "act-2",
        type: "letter-recognition",
        prompt: "Which letter makes the 'Ba' sound?",
        correctAnswer: "ب",
        options: ["ت", "ب", "ا"],
        vocabulary: {
          id: "voc-ba",
          ajami: "ب",
          transliteration: "Ba",
          translation: "'B' sound",
        },
      },
      {
        id: "act-3",
        type: "letter-recognition",
        prompt: "Which letter makes the 'Ta' sound?",
        correctAnswer: "ت",
        options: ["ب", "ا", "ت"],
        vocabulary: {
          id: "voc-ta",
          ajami: "ت",
          transliteration: "Ta",
          translation: "'T' sound",
        },
      },
    ],
  },
  {
    id: "hausa-lesson-1-2",
    unitId: "hausa-unit-1",
    title: "Reviewing the First Letters",
    description: "Practice identifying Alif, Ba, and Ta.",
    stage: 1,
    goals: ["Distinguish between Alif, Ba, and Ta reliably"],
    aiTeacherPrompt:
      "You are a supportive Ajami tutor. This is a review lesson for Alif, Ba, and Ta. Pay close attention to whether the user confuses Ba (one dot below) and Ta (two dots above). Provide hints based on the dot placement if they struggle.",
    activities: [
      {
        id: "act-4",
        type: "speaking",
        prompt: "Pronounce this letter: ب",
        correctAnswer: "ba",
        vocabularyId: "voc-ba",
      },
      {
        id: "act-5",
        type: "speaking",
        prompt: "Pronounce this letter: ت",
        correctAnswer: "ta",
        vocabularyId: "voc-ta",
      },
    ],
  },
];
