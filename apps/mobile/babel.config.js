module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      // nativewind/babel is a PRESET, not a plugin — listing it under
      // `plugins` throws ".plugins is not a valid Plugin property".
      "nativewind/babel",
    ],
  };
};
