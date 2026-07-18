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
    locked: true,
  },
  {
    id: "wolof-ajami",
    name: "Wolofal",
    /** وَـ — Wolof written in Ajami/Arabic script (Wolofal) */
    script: "وَـ",
    color: "#8B5CF6",
    description: "Learn to read and write the Wolof language using the Arabic script (Wolofal).",
    locked: true,
  },
  {
    id: "yoruba-ajami",
    name: "Yoruba Ajami",
    /** يَـ — Yoruba written in Ajami/Arabic script */
    script: "يَـ",
    color: "#EC4899",
    description: "Learn to read and write the Yoruba language using the Arabic script.",
    locked: true,
  },
  {
    id: "fulfulde-ajami",
    name: "Fulfulde Ajami",
    /** فَـ — Fulfulde written in Ajami/Arabic script */
    script: "فَـ",
    color: "#F59E0B",
    description: "Learn to read and write the Fulfulde language using the Arabic script.",
    locked: true,
  },
];
