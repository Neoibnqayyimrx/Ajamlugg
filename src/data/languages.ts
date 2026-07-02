import { Language } from "@/types/learning";

export const LANGUAGES: Language[] = [
  {
    id: "hausa-ajami",
    name: "Hausa Ajami",
    /** ها — Hausa written in Ajami/Arabic script */
    script: "هَـ",
    color: "#0E9F6E",
    description: "Learn to read and write the Hausa language using the Arabic script.",
  },
  {
    id: "swahili-ajami",
    name: "Swahili Ajami",
    /** سَـ — Swahili written in Ajami/Arabic script */
    script: "سَـ",
    color: "#3B82F6",
    description: "Learn to read and write Swahili using the Arabic script.",
  },
  {
    id: "wolof-ajami",
    name: "Wolofal",
    /** وَـ — Wolof written in Ajami/Arabic script (Wolofal) */
    script: "وَـ",
    color: "#8B5CF6",
    description: "Learn to read and write the Wolof language using the Arabic script (Wolofal).",
  },
];
