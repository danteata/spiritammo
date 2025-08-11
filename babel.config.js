module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // Add support for class static blocks (needed for pdfjs-dist)
      "@babel/plugin-transform-class-static-block",
    ],
  };
};