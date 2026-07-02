const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { FileStore } = require("metro-cache");
const path = require("path");

const config = getDefaultConfig(__dirname);

// ─── Persistent disk cache (speeds up restarts dramatically) ─────────────────
// Transformed modules are saved to disk. On the next start (without --clear)
// Metro skips re-transforming unchanged files — going from ~56s → ~2-3s.
config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, ".metro-cache"),
  }),
];

// SVG transformer setup
config.transformer.babelTransformerPath =
  require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg",
);
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

// NativeWind must wrap last, after all other config mutations
module.exports = withNativeWind(config, { input: "./global.css" });
