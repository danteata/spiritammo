const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// // Add support for PDF.js worker files
// config.resolver.assetExts.push('mjs');

// // Handle PDF.js worker imports
// config.resolver.alias = {
//   ...config.resolver.alias,
//   'pdfjs-dist/build/pdf.worker.min.mjs': 'pdfjs-dist/build/pdf.worker.min.js',
// };


/** @type {import('expo/metro-config').MetroConfig} */

module.exports = config;