/**
 * Ajami Design System — Typography Tokens
 *
 * Fonts: Poppins (UI & body) + Noto Sans Arabic (Ajami script)
 * Type scale from design.png
 */

// ─── Font Families ─────────────────────────────────────────────────────────
export const fontFamily = {
  poppins:      "Poppins_400Regular",
  poppinsMd:    "Poppins_500Medium",
  poppinsSemi:  "Poppins_600SemiBold",
  poppinsBold:  "Poppins_700Bold",
  notoArabic:   "NotoSansArabic_400Regular",
  notoArabicBold: "NotoSansArabic_700Bold",
} as const;

// ─── Font Weights ──────────────────────────────────────────────────────────
export const fontWeight = {
  regular:   "400",
  medium:    "500",
  semiBold:  "600",
  bold:      "700",
} as const;

// ─── Type Scale ────────────────────────────────────────────────────────────
/**
 * Design spec:
 *  H1 — Page/Screen Title   32px Bold    lh 1.2
 *  H2 — Section Title       24px SemiBold lh 1.3
 *  H3 — Module/Card Title   20px SemiBold lh 1.3
 *  H4 — Subheading          18px Medium   lh 1.4
 *  Body Large — Important   16px Regular  lh 1.6
 *  Body Medium — Body text  14px Regular  lh 1.6
 *  Body Small — Supporting  13px Regular  lh 1.6
 *  Caption — Labels/meta    12px Regular  lh 1.4
 */
export const typeScale = {
  h1: {
    fontSize:   32,
    lineHeight: 38,       // 32 * 1.2 ≈ 38
    fontWeight: "700" as const,
    fontFamily: fontFamily.poppinsBold,
  },
  h2: {
    fontSize:   24,
    lineHeight: 31,       // 24 * 1.3 ≈ 31
    fontWeight: "600" as const,
    fontFamily: fontFamily.poppinsSemi,
  },
  h3: {
    fontSize:   20,
    lineHeight: 26,       // 20 * 1.3 = 26
    fontWeight: "600" as const,
    fontFamily: fontFamily.poppinsSemi,
  },
  h4: {
    fontSize:   18,
    lineHeight: 25,       // 18 * 1.4 ≈ 25
    fontWeight: "500" as const,
    fontFamily: fontFamily.poppinsMd,
  },
  bodyLg: {
    fontSize:   16,
    lineHeight: 26,       // 16 * 1.6 ≈ 26
    fontWeight: "400" as const,
    fontFamily: fontFamily.poppins,
  },
  bodyMd: {
    fontSize:   14,
    lineHeight: 22,       // 14 * 1.6 ≈ 22
    fontWeight: "400" as const,
    fontFamily: fontFamily.poppins,
  },
  bodySm: {
    fontSize:   13,
    lineHeight: 21,       // 13 * 1.6 ≈ 21
    fontWeight: "400" as const,
    fontFamily: fontFamily.poppins,
  },
  caption: {
    fontSize:   12,
    lineHeight: 17,       // 12 * 1.4 ≈ 17
    fontWeight: "400" as const,
    fontFamily: fontFamily.poppins,
  },
} as const;

// ─── Ajami Script variants ─────────────────────────────────────────────────
export const ajamTypeScale = {
  h2: { ...typeScale.h2, fontFamily: fontFamily.notoArabicBold },
  h3: { ...typeScale.h3, fontFamily: fontFamily.notoArabicBold },
  body: { ...typeScale.bodyLg, fontFamily: fontFamily.notoArabic },
  caption: { ...typeScale.caption, fontFamily: fontFamily.notoArabic },
} as const;

export type TypeScaleKey = keyof typeof typeScale;
