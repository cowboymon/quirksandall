// NativeWind v4 requires wrapping Metro with withNativeWind and pointing it
// at the CSS entry file that holds the Tailwind directives.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
