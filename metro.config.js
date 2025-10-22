const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for PDF.js worker files
config.resolver.assetExts.push('mjs');

// Handle PDF.js worker imports
config.resolver.alias = {
  ...config.resolver.alias,
  'pdfjs-dist/build/pdf.worker.min.mjs': 'pdfjs-dist/build/pdf.worker.min.js',
};

// Fix for use-latest-callback Metro bundler issue
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'use-latest-callback': require.resolve('use-latest-callback'),
};

// Alternative approach: Add to sourceExts to help Metro resolve the package
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
];

/** @type {import('expo/metro-config').MetroConfig} */

module.exports = config;
