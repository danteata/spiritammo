const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add XML files as text assets
config.resolver.assetExts.push('xml');

module.exports = withNativeWind(config, { input: "./src/global.css" });
