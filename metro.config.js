const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Ensure XML files are treated as assets, not source files
const { assetExts, sourceExts } = config.resolver;
config.resolver.assetExts = [...assetExts, 'xml'];
config.resolver.sourceExts = sourceExts.filter(ext => ext !== 'xml');

module.exports = withNativeWind(config, { input: "./src/global.css" });
