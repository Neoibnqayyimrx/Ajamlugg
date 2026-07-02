/**
 * src/constants/images.ts
 *
 * Centralized image registry for the Ajami app.
 * Import images from here instead of using require() inline everywhere.
 * This makes refactoring assets easy and provides one place to manage image paths.
 */

const images = {
  // ── Mascots ───────────────────────────────────────────────────────────────
  mascotLogo:    require("@/assets/images/mascot-logo.png"),
  mascotAuth:    require("@/assets/images/mascot-auth.png"),
  mascotWelcome: require("@/assets/images/mascot-welcome.png"),

  // ── Learning visuals ──────────────────────────────────────────────────────
  ajam:          require("@/assets/images/ajam.png"),
  palace:        require("@/assets/images/palace.png"),
  treasure:      require("@/assets/images/treasure.png"),
  streakFire:    require("@/assets/images/streak-fire.png"),

  // ── App icons ─────────────────────────────────────────────────────────────
  icon:          require("@/assets/images/icon.png"),
  splashIcon:    require("@/assets/images/splash-icon.png"),

  // ── Auth providers ────────────────────────────────────────────────────────
  google:        require("@/assets/images/google.svg"),
  apple:         require("@/assets/images/apple.svg"),
  facebook:      require("@/assets/images/facebook.svg"),
} as const;

export default images;
