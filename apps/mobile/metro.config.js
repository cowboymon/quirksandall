// NativeWind v4 requires wrapping Metro with withNativeWind and pointing it
// at the CSS entry file that holds the Tailwind directives.
//
// The base config comes from Sentry rather than expo/metro-config: getSentryExpoConfig
// is getDefaultConfig plus Debug IDs stamped into the bundle and its source map.
// Those IDs are what let Sentry match a minified frame in a crash report back to
// the right line of source — without them, uploaded source maps don't attach and
// every production stack trace stays as `index.bundle:1:284729`.
//
// It's a drop-in for getDefaultConfig, so withNativeWind still wraps it the same way.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
