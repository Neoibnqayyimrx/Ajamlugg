/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // ─── Brand Colors ─────────────────────────────────────────────
      colors: {
        // Primary palette
        emerald: {
          DEFAULT: "#0E9F6E",
          50:  "#E6F7F2",
          100: "#B3E8D5",
          200: "#80D9B8",
          300: "#4DCA9B",
          400: "#26BB84",
          500: "#0E9F6E", // Ajami Emerald
          600: "#0B8A5F",
          700: "#087550",
          800: "#065F41",
          900: "#034A32",
        },
        gold: {
          DEFAULT: "#D4A017",
          50:  "#FDF6E3",
          100: "#FAE9B2",
          200: "#F6DC81",
          300: "#F3CF50",
          400: "#EFC22E",
          500: "#D4A017", // Manuscript Gold
          600: "#B88913",
          700: "#9C730F",
          800: "#805D0B",
          900: "#644707",
        },
        navy: {
          DEFAULT: "#0F172A",
          50:  "#E8EAF0",
          100: "#C5CBD9",
          200: "#9FABC2",
          300: "#798BAB",
          400: "#5C6F94",
          500: "#3F547D",
          600: "#2C3E66",
          700: "#1E2D50",
          800: "#121D3A",
          900: "#0F172A", // Ink Navy
        },
        sky: {
          DEFAULT: "#3B82F6",
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6", // Sky Blue
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },

        // Semantic colors
        success:  "#22C55E",
        warning:  "#F59E0B",
        streak:   "#FB923C",
        error:    "#EF4444",
        info:     "#3B82F6",

        // Neutrals
        "text-primary":   "#0F172A",
        "text-secondary": "#64748B",
        border:    "#E2E8F0",
        surface:   "#F8FAFC",
        background: "#FFFFFF",
      },

      // ─── Typography ───────────────────────────────────────────────
      fontFamily: {
        poppins:         ["Poppins_400Regular", "sans-serif"],
        "poppins-medium": ["Poppins_500Medium", "sans-serif"],
        "poppins-semi":  ["Poppins_600SemiBold", "sans-serif"],
        "poppins-bold":  ["Poppins_700Bold", "sans-serif"],
        "noto-arabic":   ["NotoSansArabic_400Regular", "sans-serif"],
        "noto-arabic-bold": ["NotoSansArabic_700Bold", "sans-serif"],
      },

      fontSize: {
        // Type scale from design system
        "h1": ["32px", { lineHeight: "38px", fontWeight: "700" }],
        "h2": ["24px", { lineHeight: "31px", fontWeight: "600" }],
        "h3": ["20px", { lineHeight: "26px", fontWeight: "600" }],
        "h4": ["18px", { lineHeight: "25px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "26px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "21px", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "17px", fontWeight: "400" }],
      },

      // ─── Spacing ──────────────────────────────────────────────────
      spacing: {
        "0.5": "2px",
        "1":   "4px",
        "1.5": "6px",
        "2":   "8px",
        "2.5": "10px",
        "3":   "12px",
        "3.5": "14px",
        "4":   "16px",
        "5":   "20px",
        "6":   "24px",
        "7":   "28px",
        "8":   "32px",
        "9":   "36px",
        "10":  "40px",
        "11":  "44px",
        "12":  "48px",
        "14":  "56px",
        "16":  "64px",
        "20":  "80px",
        "24":  "96px",
        "28":  "112px",
        "32":  "128px",
        "36":  "144px",
        "40":  "160px",
        "48":  "192px",
        "56":  "224px",
        "64":  "256px",
      },

      // ─── Border Radius ────────────────────────────────────────────
      borderRadius: {
        none:  "0px",
        sm:    "4px",
        DEFAULT: "8px",
        md:    "12px",
        lg:    "16px",
        xl:    "20px",
        "2xl": "24px",
        "3xl": "32px",
        full:  "9999px",
      },

      // ─── Shadows ──────────────────────────────────────────────────
      boxShadow: {
        sm:   "0 1px 2px rgba(15, 23, 42, 0.05)",
        DEFAULT: "0 2px 8px rgba(15, 23, 42, 0.08)",
        md:   "0 4px 16px rgba(15, 23, 42, 0.10)",
        lg:   "0 8px 24px rgba(15, 23, 42, 0.12)",
        xl:   "0 12px 40px rgba(15, 23, 42, 0.16)",
        card: "0 2px 12px rgba(14, 159, 110, 0.10)",
        "emerald-glow": "0 4px 20px rgba(14, 159, 110, 0.25)",
        "gold-glow":    "0 4px 20px rgba(212, 160, 23, 0.25)",
        none: "none",
      },

      // ─── Opacity ──────────────────────────────────────────────────
      opacity: {
        0:   "0",
        5:   "0.05",
        10:  "0.10",
        20:  "0.20",
        25:  "0.25",
        30:  "0.30",
        40:  "0.40",
        50:  "0.50",
        60:  "0.60",
        70:  "0.70",
        75:  "0.75",
        80:  "0.80",
        90:  "0.90",
        95:  "0.95",
        100: "1",
      },

      // ─── Animation ────────────────────────────────────────────────
      transitionDuration: {
        fast:   "150ms",
        normal: "250ms",
        slow:   "400ms",
      },
    },
  },
  plugins: [],
};