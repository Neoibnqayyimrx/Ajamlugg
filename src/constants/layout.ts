/**
 * Ajami Design System — Spacing, Radius & Shadow Tokens
 */

// ─── Spacing Scale (4-point grid) ──────────────────────────────────────────
export const spacing = {
  0:    0,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  9:    36,
  10:   40,
  11:   44,
  12:   48,
  14:   56,
  16:   64,
  20:   80,
  24:   96,
  28:   112,
  32:   128,
} as const;

export type SpacingKey = keyof typeof spacing;

// ─── Border Radius ─────────────────────────────────────────────────────────
export const radius = {
  none:  0,
  sm:    4,
  md:    12,
  lg:    16,
  xl:    20,
  "2xl": 24,
  "3xl": 32,
  full:  9999,
} as const;

export type RadiusKey = keyof typeof radius;

// ─── Elevation / Shadows ───────────────────────────────────────────────────
/**
 * Use boxShadow style prop (New Arch) — never use legacy elevation or shadow*.
 */
export const shadow = {
  none: "none",
  sm:   "0 1px 2px rgba(15, 23, 42, 0.05)",
  md:   "0 2px 8px rgba(15, 23, 42, 0.08)",
  lg:   "0 4px 16px rgba(15, 23, 42, 0.10)",
  xl:   "0 8px 24px rgba(15, 23, 42, 0.12)",
  card: "0 2px 12px rgba(14, 159, 110, 0.10)",
  emeraldGlow: "0 4px 20px rgba(14, 159, 110, 0.25)",
  goldGlow:    "0 4px 20px rgba(212, 160, 23, 0.25)",
} as const;

export type ShadowKey = keyof typeof shadow;
