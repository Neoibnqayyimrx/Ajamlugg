/**
 * src/constants/images.ts
 *
 * Centralized image registry for the Ajami app.
 * Import images from here instead of using require() inline everywhere.
 * This makes refactoring assets easy and provides one place to manage image paths.
 */

const images = {
  // ── Mascots ───────────────────────────────────────────────────────────────
  mascotLogo:    require("@/assets/images/mascot-logo.webp"),
  mascotAuth:    require("@/assets/images/mascot-auth.webp"),
  mascotWelcome: require("@/assets/images/mascot-welcome.webp"),

  // ── Learning visuals ──────────────────────────────────────────────────────
  ajam:          require("@/assets/images/ajam.webp"),
  palace:        require("@/assets/images/palace.webp"),
  treasure:      require("@/assets/images/treasure.webp"),
  streakFire:    require("@/assets/images/streak-fire.webp"),

  // ── App icons ─────────────────────────────────────────────────────────────
  icon:          require("@/assets/images/icon.png"),
  splashIcon:    require("@/assets/images/splash-icon.png"),

  // ── Auth providers ────────────────────────────────────────────────────────
  google:        require("@/assets/images/google.svg"),
  apple:         require("@/assets/images/apple.svg"),
  facebook:      require("@/assets/images/facebook.svg"),
} as const;

export default images;
