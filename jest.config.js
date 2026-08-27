/**
 * jest.config.js
 *
 * Uses the `jest-expo/node` preset rather than the default `jest-expo` one.
 * The default preset is multi-project (ios + android + web), so it runs every
 * test three times — worth it for component tests that genuinely differ per
 * platform, wasted on the pure grading/scoring/validation modules, which
 * import no React Native at all.
 *
 * When Phase 2 adds lesson-player component tests, this grows into a `projects`
 * config: this node project for `src/features/**`, plus a react-native project
 * for the screens.
 *
 * `@/` is mapped here because the alias is declared in tsconfig.json, which
 * Metro reads and Babel does not — without this, every `@/...` import resolves
 * fine in the app and fails only under test.
 */

module.exports = {
  preset: "jest-expo/node",
  // Order matters: the more specific @/assets mapping has to come first, or
  // the general @/ rule would swallow it and point at src/assets.
  moduleNameMapper: {
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: ["src/features/**/*.ts", "src/constants/xp.ts"],
};
