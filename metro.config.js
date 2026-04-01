const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Ensure XML and EPUB files are treated as assets, not source files
const { assetExts, sourceExts } = config.resolver;
config.resolver.assetExts = [...assetExts, 'xml', 'wasm', 'epub'];
config.resolver.sourceExts = sourceExts.filter(ext => ext !== 'xml');

// Enable package exports resolution for packages like convex
config.resolver.unstable_enablePackageExports = true;

// Add wasm file support
config.resolver.sourceExts = [...config.resolver.sourceExts, 'wasm'];

module.exports = withNativeWind(config, { input: "./global.css" });
