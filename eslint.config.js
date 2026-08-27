// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "node_modules/**",
      // vision-agent is a Python service. Its virtualenv ships vendored JS
      // (win32com test fixtures, urllib3's emscripten worker) that otherwise
      // dominates the lint output with errors we neither own nor can fix.
      "vision-agent/**",
      ".expo/**",
      ".metro-cache/**",
    ],
  }
]);
