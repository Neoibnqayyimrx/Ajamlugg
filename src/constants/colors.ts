/**
 * Ajami Design System — Color Tokens
 *
 * Single source of truth for all brand, semantic, and neutral colors.
 * Use these constants in inline styles or pass to StyleSheet.
 * For NativeWind className usage, use the Tailwind config equivalents.
 */

// ─── Primary Brand Palette ─────────────────────────────────────────────────
export const colors = {
  // Ajami Emerald — primary CTA, success, progress
  emerald: {
    DEFAULT: "#0E9F6E",
    50:      "#E6F7F2",
    100:     "#B3E8D5",
    200:     "#80D9B8",
    300:     "#4DCA9B",
    400:     "#26BB84",
    500:     "#0E9F6E",
    600:     "#0B8A5F",
    700:     "#087550",
    800:     "#065F41",
    900:     "#034A32",
  },

  // Manuscript Gold — accents, achievements, highlights
  gold: {
    DEFAULT: "#D4A017",
    50:      "#FDF6E3",
    100:     "#FAE9B2",
    200:     "#F6DC81",
    300:     "#F3CF50",
    400:     "#EFC22E",
    500:     "#D4A017",
    600:     "#B88913",
    700:     "#9C730F",
    800:     "#805D0B",
    900:     "#644707",
  },

  // Ink Navy — headings, high-contrast text
  navy: {
    DEFAULT: "#0F172A",
    50:      "#E8EAF0",
    100:     "#C5CBD9",
    200:     "#9FABC2",
    300:     "#798BAB",
    400:     "#5C6F94",
    500:     "#3F547D",
    600:     "#2C3E66",
    700:     "#1E2D50",
    800:     "#121D3A",
    900:     "#0F172A",
  },

  // Sky Blue — information, links, interactive
  sky: {
    DEFAULT: "#3B82F6",
    50:      "#EFF6FF",
    100:     "#DBEAFE",
    200:     "#BFDBFE",
    300:     "#93C5FD",
    400:     "#60A5FA",
    500:     "#3B82F6",
    600:     "#2563EB",
    700:     "#1D4ED8",
    800:     "#1E40AF",
    900:     "#1E3A8A",
  },
} as const;

// ─── Semantic Colors ───────────────────────────────────────────────────────
export const semantic = {
  success: "#22C55E",
  warning: "#F59E0B",
  streak:  "#FB923C",
  error:   "#EF4444",
  info:    "#3B82F6",
} as const;

// ─── Neutral / UI Colors ───────────────────────────────────────────────────
export const neutral = {
  textPrimary:   "#0F172A",
  textSecondary: "#64748B",
  border:        "#E2E8F0",
  surface:       "#F8FAFC",
  background:    "#FFFFFF",
} as const;

// ─── Flat export for convenience ───────────────────────────────────────────
export const palette = {
  emerald:        colors.emerald.DEFAULT,
  emeraldLight:   colors.emerald[50],
  emeraldDark:    colors.emerald[700],
  gold:           colors.gold.DEFAULT,
  goldLight:      colors.gold[50],
  goldDark:       colors.gold[700],
  navy:           colors.navy.DEFAULT,
  navyLight:      colors.navy[50],
  sky:            colors.sky.DEFAULT,
  skyLight:       colors.sky[50],
  ...semantic,
  ...neutral,
} as const;

export type ColorToken = keyof typeof palette;
