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
      "Teach Alif (ا), Ba (ب), and Ta (ت) one at a time, slowly. Introduce each letter's sound by connecting it to a familiar Hausa word the learner already knows — the lesson is taught entirely in Hausa, so don't reach for English comparisons. If the learner mispronounces a letter, name exactly which sound was off, model it again slowly, and have them retry right away.",
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
      "This is a review lesson for Alif, Ba, and Ta — quiz one letter at a time rather than all at once. Listen closely for confusion between Ba (one dot below) and Ta (two dots above); if they mix them up, point to the dot placement as the specific clue and have them try again immediately.",
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
  {
    id: "hausa-lesson-1-3",
    unitId: "hausa-unit-1",
    title: "Dots That Change Sounds",
    description: "Learn Tha, Jim, and Ha — letters that share shapes but differ by dots.",
    stage: 1,
    goals: [
      "Recognize the letter Tha (ث)",
      "Recognize the letter Jim (ج)",
      "Recognize the letter Ha (ح)",
    ],
    aiTeacherPrompt:
      "Introduce Tha (ث), Jim (ج), and Ha (ح) one at a time, slowly — these three share a base shape, so pause on each letter's dots before moving to the next. If the learner confuses two letters, point out exactly which dot differs and have them compare the shapes before retrying.",
    activities: [
      {
        id: "act-6",
        type: "letter-recognition",
        prompt: "Which letter makes the 'Ja' sound?",
        correctAnswer: "ج",
        options: ["ح", "ج", "ث"],
        vocabulary: {
          id: "voc-jim",
          ajami: "ج",
          transliteration: "Jim",
          translation: "'J' sound",
        },
      },
      {
        id: "act-7",
        type: "letter-recognition",
        prompt: "Which letter has three dots above?",
        correctAnswer: "ث",
        options: ["ث", "ج", "ح"],
        vocabulary: {
          id: "voc-tha",
          ajami: "ث",
          transliteration: "Tha",
          translation: "'Th' sound",
        },
      },
    ],
  },
  {
    id: "hausa-lesson-1-4",
    unitId: "hausa-unit-1",
    title: "Vowel Marks",
    description: "Learn fatha, kasra, and damma — the marks that give letters their vowels.",
    stage: 1,
    goals: [
      "Recognize fatha (َ) as the 'a' vowel",
      "Recognize kasra (ِ) as the 'i' vowel",
      "Recognize damma (ُ) as the 'u' vowel",
    ],
    aiTeacherPrompt:
      "Introduce fatha, kasra, and damma one mark at a time, showing how each changes ب into 'ba', 'bi', or 'bu'. Have the learner say the resulting syllable aloud after each mark before adding the next one, so the pattern builds step by step.",
    activities: [
      {
        id: "act-8",
        type: "letter-recognition",
        prompt: "Which one reads as 'bi'?",
        correctAnswer: "بِ",
        options: ["بَ", "بِ", "بُ"],
        vocabulary: {
          id: "voc-kasra",
          ajami: "بِ",
          transliteration: "bi",
          translation: "Ba with kasra ('i' vowel)",
        },
      },
      {
        id: "act-9",
        type: "speaking",
        prompt: "Pronounce this: بُ",
        correctAnswer: "bu",
      },
    ],
  },
  {
    id: "hausa-lesson-1-5",
    unitId: "hausa-unit-1",
    title: "Special Hausa Sounds",
    description: "Meet the modified letters Ajami uses for Hausa's own sounds like ɓ and ɗ.",
    stage: 1,
    goals: [
      "Recognize the Ajami letter for the Hausa ɓ sound",
      "Recognize the Ajami letter for the Hausa ɗ sound",
    ],
    aiTeacherPrompt:
      "Explain that Hausa has implosive sounds (ɓ, ɗ) standard Arabic letters can't capture, so Hausa Ajami adds extra dots to mark them. Model the 'b' vs 'ɓ' contrast slowly using a familiar Hausa word for each, then let the learner imitate one sound at a time, confirming before moving to the next.",
    activities: [
      {
        id: "act-10",
        type: "letter-recognition",
        prompt: "Hausa Ajami writes the ɓ sound with a modified form of which letter?",
        correctAnswer: "ب",
        options: ["ب", "ت", "ج"],
      },
      {
        id: "act-11",
        type: "speaking",
        prompt: "Pronounce the Hausa word 'ɓera' (rat)",
        correctAnswer: "ɓera",
      },
    ],
  },
  {
    id: "hausa-lesson-1-6",
    unitId: "hausa-unit-1",
    title: "Unit Review Challenge",
    description: "Put it all together — every letter and vowel mark from this unit.",
    stage: 1,
    goals: ["Identify all unit letters quickly and reliably"],
    aiTeacherPrompt:
      "Run a review session on Alif, Ba, Ta, Tha, Jim, and Ha with vowel marks, mixing the order one question at a time. Vary your celebration language for streaks of correct answers, and if they miss the same letter twice, slow down and revisit its distinguishing dot before continuing.",
    activities: [
      {
        id: "act-12",
        type: "letter-recognition",
        prompt: "Which letter makes the 'Ha' sound?",
        correctAnswer: "ح",
        options: ["ج", "ح", "ب"],
      },
      {
        id: "act-13",
        type: "letter-recognition",
        prompt: "Which one reads as 'ta'?",
        correctAnswer: "تَ",
        options: ["تَ", "ثَ", "بَ"],
      },
    ],
  },
  {
    id: "hausa-lesson-2-1",
    unitId: "hausa-unit-2",
    title: "Joining Letters",
    description: "Learn how letters change shape when they connect inside a word.",
    stage: 2,
    goals: [
      "Recognize initial, medial, and final letter forms",
      "Read a two-letter combination",
    ],
    aiTeacherPrompt:
      "Show how Ba (ب) changes shape — بـ at the start of a word, ـب at the end — one form at a time. Walk through joining Ba + Alif to read 'ba' step by step, confirming the learner follows each small step before adding the next, and have them read it back to you.",
    activities: [
      {
        id: "act-14",
        type: "word-formation",
        prompt: "Join Ba (ب) and Alif (ا). What does با read as?",
        correctAnswer: "ba",
        options: ["ba", "ab", "ta"],
      },
      {
        id: "act-15",
        type: "letter-recognition",
        prompt: "Which is the connected (initial) form of Ba?",
        correctAnswer: "بـ",
        options: ["بـ", "ـب", "ب"],
      },
    ],
  },
  {
    id: "hausa-lesson-2-2",
    unitId: "hausa-unit-2",
    title: "Your First Word",
    description: "Read and pronounce your first full Hausa word written in Ajami.",
    stage: 2,
    goals: ["Read the word 'baba' (father) in Ajami script"],
    aiTeacherPrompt:
      "Guide the learner through بَابَا ('baba' — father) one letter at a time, then have them blend it into the whole word themselves. This is their first real word — mark it with genuine, specific praise once they read it, not a generic line.",
    activities: [
      {
        id: "act-16",
        type: "reading",
        prompt: "Read this word: بَابَا",
        correctAnswer: "baba",
        options: ["baba", "tata", "bata"],
        vocabulary: {
          id: "voc-baba",
          ajami: "بَابَا",
          transliteration: "baba",
          translation: "father",
        },
      },
      {
        id: "act-17",
        type: "speaking",
        prompt: "Pronounce this word: بَابَا",
        correctAnswer: "baba",
        vocabularyId: "voc-baba",
      },
    ],
  },

  // ─── Swahili Ajami ──────────────────────────────────────────────────────────
  {
    id: "swahili-lesson-1-1",
    unitId: "swahili-unit-1",
    title: "The First Three Letters",
    description: "Learn to recognize Alif, Ba, and Ta in their isolated forms.",
    stage: 1,
    goals: [
      "Recognize the letter Alif (ا)",
      "Recognize the letter Ba (ب)",
      "Recognize the letter Ta (ت)",
    ],
    aiTeacherPrompt:
      "Introduce Alif, Ba, and Ta one at a time, slowly, relating each sound to a familiar Swahili word ('baba', 'tatu') before moving to the next letter. Keep each turn short, and vary your encouragement rather than repeating the same praise.",
    activities: [
      {
        id: "sw-act-1",
        type: "letter-recognition",
        prompt: "Which letter makes the 'A' sound?",
        correctAnswer: "ا",
        options: ["ا", "ب", "ت"],
        vocabulary: {
          id: "voc-sw-alif",
          ajami: "ا",
          transliteration: "Alif",
          translation: "'A' sound",
        },
      },
      {
        id: "sw-act-2",
        type: "letter-recognition",
        prompt: "Which letter makes the 'Ba' sound?",
        correctAnswer: "ب",
        options: ["ت", "ب", "ا"],
      },
    ],
  },
  {
    id: "swahili-lesson-1-2",
    unitId: "swahili-unit-1",
    title: "More Everyday Letters",
    description: "Learn Mim, Nun, and Waw — letters you will see in many Swahili words.",
    stage: 1,
    goals: [
      "Recognize the letter Mim (م)",
      "Recognize the letter Nun (ن)",
      "Recognize the letter Waw (و)",
    ],
    aiTeacherPrompt:
      "Teach Mim (م), Nun (ن), and Waw (و) one at a time, connecting each to a familiar Swahili word ('mama', 'nane', 'wewe') before introducing the next. If the learner mispronounces one, name exactly what was off, model it again, and have them retry immediately.",
    activities: [
      {
        id: "sw-act-3",
        type: "letter-recognition",
        prompt: "Which letter makes the 'Ma' sound?",
        correctAnswer: "م",
        options: ["ن", "م", "و"],
        vocabulary: {
          id: "voc-sw-mim",
          ajami: "م",
          transliteration: "Mim",
          translation: "'M' sound",
        },
      },
      {
        id: "sw-act-4",
        type: "speaking",
        prompt: "Pronounce this letter: ن",
        correctAnswer: "na",
      },
    ],
  },
  {
    id: "swahili-lesson-1-3",
    unitId: "swahili-unit-1",
    title: "Vowel Marks",
    description: "Learn the marks that turn letters into syllables: 'a', 'i', and 'u'.",
    stage: 1,
    goals: [
      "Recognize fatha, kasra, and damma",
      "Read simple marked letters like مَ and مِ",
    ],
    aiTeacherPrompt:
      "Introduce fatha, kasra, and damma one at a time, showing how each turns م into 'ma', 'mi', or 'mu'. Swahili favors open syllables, so drill each new combination rhythmically before layering on the next, and have the learner echo each one back.",
    activities: [
      {
        id: "sw-act-5",
        type: "letter-recognition",
        prompt: "Which one reads as 'mi'?",
        correctAnswer: "مِ",
        options: ["مَ", "مِ", "مُ"],
      },
      {
        id: "sw-act-6",
        type: "speaking",
        prompt: "Pronounce this: مَ",
        correctAnswer: "ma",
      },
    ],
  },
  {
    id: "swahili-lesson-1-4",
    unitId: "swahili-unit-1",
    title: "Reading Syllables",
    description: "Combine letters and vowels to read Swahili-style syllables.",
    stage: 2,
    goals: ["Read consonant + vowel syllables fluently"],
    aiTeacherPrompt:
      "Drill the learner on reading با (ba), ما (ma), نا (na) one syllable at a time before mixing them up, increasing speed gradually. Invite them to clap the rhythm like a Swahili song, and always end a turn by asking for the next syllable.",
    activities: [
      {
        id: "sw-act-7",
        type: "word-formation",
        prompt: "Join Ma (م) and Alif (ا). What does ما read as?",
        correctAnswer: "ma",
        options: ["ma", "am", "mu"],
      },
      {
        id: "sw-act-8",
        type: "reading",
        prompt: "Read this syllable: نا",
        correctAnswer: "na",
        options: ["na", "ni", "nu"],
      },
    ],
  },
  {
    id: "swahili-lesson-1-5",
    unitId: "swahili-unit-1",
    title: "Your First Word: Mama",
    description: "Read and pronounce your first full Swahili word written in Ajami.",
    stage: 2,
    goals: ["Read the word 'mama' (mother) in Ajami script"],
    aiTeacherPrompt:
      "Guide the learner through مَامَا ('mama' — mother) one letter at a time, then have them blend it into the full word themselves. When they read it, celebrate this milestone with specific, genuine praise — their first Swahili word in Ajami.",
    activities: [
      {
        id: "sw-act-9",
        type: "reading",
        prompt: "Read this word: مَامَا",
        correctAnswer: "mama",
        options: ["mama", "baba", "nana"],
        vocabulary: {
          id: "voc-sw-mama",
          ajami: "مَامَا",
          transliteration: "mama",
          translation: "mother",
        },
      },
      {
        id: "sw-act-10",
        type: "speaking",
        prompt: "Pronounce this word: مَامَا",
        correctAnswer: "mama",
        vocabularyId: "voc-sw-mama",
      },
    ],
  },
  {
    id: "swahili-lesson-1-6",
    unitId: "swahili-unit-1",
    title: "Greetings in Ajami",
    description: "Read the greeting 'salama' and practice saying it warmly.",
    stage: 2,
    goals: ["Read and pronounce 'salama' (peace/safe) in Ajami"],
    aiTeacherPrompt:
      "Teach سَلَامَا ('salama') one syllable at a time, then explain its role in Swahili greetings. Once they can read it, invite them to greet you with it out loud, and respond warmly as if it were a real greeting.",
    activities: [
      {
        id: "sw-act-11",
        type: "reading",
        prompt: "Read this word: سَلَامَا",
        correctAnswer: "salama",
        options: ["salama", "samala", "malasa"],
        vocabulary: {
          id: "voc-sw-salama",
          ajami: "سَلَامَا",
          transliteration: "salama",
          translation: "peace / safe (greeting)",
        },
      },
      {
        id: "sw-act-12",
        type: "speaking",
        prompt: "Greet me in Swahili: سَلَامَا",
        correctAnswer: "salama",
        vocabularyId: "voc-sw-salama",
      },
    ],
  },

  // ─── Wolofal (Wolof Ajami) ──────────────────────────────────────────────────
  {
    id: "wolof-lesson-1-1",
    unitId: "wolof-unit-1",
    title: "The First Three Letters",
    description: "Learn to recognize Alif, Ba, and Ta in their isolated forms.",
    stage: 1,
    goals: [
      "Recognize the letter Alif (ا)",
      "Recognize the letter Ba (ب)",
      "Recognize the letter Ta (ت)",
    ],
    aiTeacherPrompt:
      "Introduce Alif, Ba, and Ta one at a time, relating each to a familiar Wolof word like 'baay' before moving on. Keep each turn short, and vary your encouragement rather than repeating the same phrase.",
    activities: [
      {
        id: "wo-act-1",
        type: "letter-recognition",
        prompt: "Which letter makes the 'A' sound?",
        correctAnswer: "ا",
        options: ["ا", "ب", "ت"],
        vocabulary: {
          id: "voc-wo-alif",
          ajami: "ا",
          transliteration: "Alif",
          translation: "'A' sound",
        },
      },
      {
        id: "wo-act-2",
        type: "letter-recognition",
        prompt: "Which letter makes the 'Ba' sound?",
        correctAnswer: "ب",
        options: ["ت", "ب", "ا"],
      },
    ],
  },
  {
    id: "wolof-lesson-1-2",
    unitId: "wolof-unit-1",
    title: "Letters for Wolof Voices",
    description: "Learn Sin, Lam, and Mim — the backbone of many Wolof words.",
    stage: 1,
    goals: [
      "Recognize the letter Sin (س)",
      "Recognize the letter Lam (ل)",
      "Recognize the letter Mim (م)",
    ],
    aiTeacherPrompt:
      "Teach Sin (س), Lam (ل), and Mim (م) one at a time, connecting each to a familiar Wolof word ('salaam', 'lekk') before introducing the next. If the learner mispronounces one, name exactly what was off and have them retry right away.",
    activities: [
      {
        id: "wo-act-3",
        type: "letter-recognition",
        prompt: "Which letter makes the 'La' sound?",
        correctAnswer: "ل",
        options: ["س", "ل", "م"],
        vocabulary: {
          id: "voc-wo-lam",
          ajami: "ل",
          transliteration: "Lam",
          translation: "'L' sound",
        },
      },
      {
        id: "wo-act-4",
        type: "speaking",
        prompt: "Pronounce this letter: س",
        correctAnswer: "sa",
      },
    ],
  },
  {
    id: "wolof-lesson-1-3",
    unitId: "wolof-unit-1",
    title: "Special Wolof Sounds",
    description: "Meet the modified letters Wolofal uses for sounds like ñ and ŋ.",
    stage: 1,
    goals: [
      "Recognize the Wolofal letter for the ñ sound",
      "Recognize the Wolofal letter for the ŋ sound",
    ],
    aiTeacherPrompt:
      "Explain that Wolof has sounds (ñ as in 'ñam', ŋ as in 'ŋaam') standard Arabic letters can't write, so Wolofal marks them with extra dots. Model one sound at a time slowly, let the learner imitate it, and confirm before introducing the second sound.",
    activities: [
      {
        id: "wo-act-5",
        type: "letter-recognition",
        prompt: "Wolofal writes the ñ sound with a modified form of which letter?",
        correctAnswer: "ن",
        options: ["ن", "ب", "س"],
      },
      {
        id: "wo-act-6",
        type: "speaking",
        prompt: "Pronounce the Wolof word 'ñam' (food/taste)",
        correctAnswer: "ñam",
      },
    ],
  },
  {
    id: "wolof-lesson-1-4",
    unitId: "wolof-unit-1",
    title: "Vowel Marks",
    description: "Learn the marks that give Wolofal letters their vowels.",
    stage: 1,
    goals: [
      "Recognize fatha, kasra, and damma",
      "Read simple marked letters like لَ and لِ",
    ],
    aiTeacherPrompt:
      "Introduce fatha, kasra, and damma one at a time, showing how each turns ل into 'la', 'li', or 'lu'. Drill each new combination at a comfortable pace before adding the next, and vary how you celebrate correct reads.",
    activities: [
      {
        id: "wo-act-7",
        type: "letter-recognition",
        prompt: "Which one reads as 'lu'?",
        correctAnswer: "لُ",
        options: ["لَ", "لِ", "لُ"],
      },
      {
        id: "wo-act-8",
        type: "speaking",
        prompt: "Pronounce this: لَ",
        correctAnswer: "la",
      },
    ],
  },
  {
    id: "wolof-lesson-1-5",
    unitId: "wolof-unit-1",
    title: "Your First Word: Baay",
    description: "Read and pronounce your first full Wolof word written in Wolofal.",
    stage: 2,
    goals: ["Read the word 'baay' (father) in Wolofal script"],
    aiTeacherPrompt:
      "Guide the learner through بَاي ('baay' — father) one letter at a time, then have them blend it into the whole word. When they read it, mark this milestone with specific, genuine praise — their first Wolof word in Ajami script.",
    activities: [
      {
        id: "wo-act-9",
        type: "reading",
        prompt: "Read this word: بَاي",
        correctAnswer: "baay",
        options: ["baay", "yaay", "taay"],
        vocabulary: {
          id: "voc-wo-baay",
          ajami: "بَاي",
          transliteration: "baay",
          translation: "father",
        },
      },
      {
        id: "wo-act-10",
        type: "speaking",
        prompt: "Pronounce this word: بَاي",
        correctAnswer: "baay",
        vocabularyId: "voc-wo-baay",
      },
    ],
  },
  {
    id: "wolof-lesson-1-6",
    unitId: "wolof-unit-1",
    title: "Greetings in Wolofal",
    description: "Read the greeting 'salaam' and practice using it.",
    stage: 2,
    goals: ["Read and pronounce 'salaam' (peace) in Wolofal"],
    aiTeacherPrompt:
      "Teach سَلَام ('salaam') one syllable at a time, then explain its role in Wolof greetings ('salaam aleekum'). Once they can read it, invite them to greet you with it, and respond warmly as if it were a real greeting.",
    activities: [
      {
        id: "wo-act-11",
        type: "reading",
        prompt: "Read this word: سَلَام",
        correctAnswer: "salaam",
        options: ["salaam", "maalas", "samaal"],
        vocabulary: {
          id: "voc-wo-salaam",
          ajami: "سَلَام",
          transliteration: "salaam",
          translation: "peace (greeting)",
        },
      },
      {
        id: "wo-act-12",
        type: "speaking",
        prompt: "Greet me in Wolof: سَلَام",
        correctAnswer: "salaam",
        vocabularyId: "voc-wo-salaam",
      },
    ],
  },
];
