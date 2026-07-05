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
      "You are a supportive Ajami tutor teaching Hausa Ajami. Teach Tha (ث), Jim (ج), and Ha (ح). Emphasize that dot count and placement change the sound. If the learner confuses letters, point to the dots as the clue.",
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
      "You are a supportive Ajami tutor teaching Hausa Ajami vowel marks. Explain that fatha, kasra, and damma sit above or below a letter and give it the 'a', 'i', or 'u' sound. Use 'ba', 'bi', 'bu' as examples and have the learner say each aloud.",
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
      "You are a supportive Ajami tutor. Explain that Hausa has implosive sounds (ɓ, ɗ) that standard Arabic letters cannot write, so Hausa Ajami uses modified letters with extra dots. Model the difference between 'b' and 'ɓ' slowly and let the learner imitate.",
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
      "You are a supportive Ajami tutor running a review session. Quiz the learner on Alif, Ba, Ta, Tha, Jim, and Ha with vowel marks, mixing the order. Celebrate streaks of correct answers and slow down on any letter they miss twice.",
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
      "You are a supportive Ajami tutor teaching letter joining. Show how Ba (ب) becomes بـ at the start of a word and ـب at the end. Walk through joining Ba + Alif to read 'ba'. Keep each step small and confirm understanding before moving on.",
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
      "You are a supportive Ajami tutor. Guide the learner to read بَابَا ('baba' — father) letter by letter, then as a whole word. Praise them for reading their first real Hausa word in Ajami.",
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
      "You are a supportive Ajami tutor teaching a beginner Swahili Ajami. Focus on Alif, Ba, and Ta. Relate the sounds to familiar Swahili words like 'baba' and 'tatu'. Keep instructions brief and encouraging.",
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
      "You are a supportive Ajami tutor teaching Swahili Ajami. Teach Mim (م), Nun (ن), and Waw (و). Connect each to common Swahili words: 'mama', 'nane', 'wewe'. Gently correct mispronunciations.",
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
      "You are a supportive Ajami tutor teaching Swahili Ajami vowel marks. Show how fatha, kasra, and damma turn م into 'ma', 'mi', 'mu'. Swahili loves open syllables, so drill consonant+vowel combinations rhythmically.",
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
      "You are a supportive Ajami tutor. Drill the learner on reading syllables like با (ba), ما (ma), نا (na). Mix them up and increase speed slowly. Encourage the learner to clap the syllable rhythm like a Swahili song.",
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
      "You are a supportive Ajami tutor. Guide the learner to read مَامَا ('mama' — mother) letter by letter, then as a whole word. Celebrate this milestone — their first Swahili word in Ajami.",
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
      "You are a supportive Ajami tutor. Teach the learner to read سَلَامَا ('salama'). Explain its cultural role in Swahili greetings and have them practice greeting you with it.",
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
      "You are a supportive Ajami tutor teaching a beginner Wolofal (Wolof Ajami). Focus on Alif, Ba, and Ta. Relate the sounds to familiar Wolof words like 'baay'. Keep instructions brief and encouraging.",
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
      "You are a supportive Ajami tutor teaching Wolofal. Teach Sin (س), Lam (ل), and Mim (م). Connect them to Wolof words like 'salaam' and 'lekk'. Gently correct mispronunciations with simple comparisons.",
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
      "You are a supportive Ajami tutor teaching Wolofal. Explain that Wolof has sounds (ñ as in 'ñam', ŋ as in 'ŋaam') that standard Arabic letters cannot write, so Wolofal uses letters with extra dots. Model each sound slowly and let the learner imitate.",
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
      "You are a supportive Ajami tutor teaching Wolofal vowel marks. Show how fatha, kasra, and damma turn ل into 'la', 'li', 'lu'. Drill combinations at a comfortable pace and celebrate correct reads.",
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
      "You are a supportive Ajami tutor. Guide the learner to read بَاي ('baay' — father) letter by letter, then as a whole word. Celebrate this milestone — their first Wolof word in Ajami script.",
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
      "You are a supportive Ajami tutor. Teach the learner to read سَلَام ('salaam'). Explain its role in Wolof greetings ('salaam aleekum') and have them practice greeting you with it.",
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
