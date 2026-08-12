import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { markSplashHidden } from "../lib/splash";
import { useFonts } from "expo-font";
import { initRevenueCat } from "../lib/purchases";
import { configureNotifications } from "../lib/notifications";
import { initAnalytics } from "../lib/analytics";
import { initErrorReporting } from "../lib/errors";
import AppAlertHost from "../components/AppAlertHost";

// Before anything else, so a crash during font loading or SDK startup is still
// captured. No-op without EXPO_PUBLIC_SENTRY_DSN.
initErrorReporting();

SplashScreen.preventAutoHideAsync();

// Hold the splash for a minimum beat rather than hiding the instant fonts
// resolve — on a warm launch that's ~200ms, which reads as a flicker rather
// than a brand moment. Measured from module load (app start), so a slow load
// doesn't add to it: if fonts take longer than this, the splash hides as soon
// as they're ready and nobody waits twice.
const MIN_SPLASH_MS = 2000;
const startedAt = Date.now();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Tanker: require("../assets/fonts/Tanker-Regular.ttf"),
    Satoshi: require("../assets/fonts/Satoshi-Regular.ttf"),
    "Satoshi-Light": require("../assets/fonts/Satoshi-Light.ttf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.ttf"),
    // Icons no longer need preloading: Phosphor draws SVG paths via
    // react-native-svg rather than glyphs from an icon font, so there's no
    // font to race the first paint (which is what the old Ionicons/Entypo
    // preload here was guarding against).
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    // Start SDKs immediately — no reason to make them wait behind the splash.
    initRevenueCat();
    initAnalytics();
    configureNotifications();
    const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt));
    const t = setTimeout(() => { SplashScreen.hideAsync(); markSplashHidden(); }, remaining);
    return () => clearTimeout(t);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F8ECEE" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="auth-callback" options={{ animation: "none" }} />
        <Stack.Screen name="accept-terms" />
        <Stack.Screen name="onboarding" options={{ presentation: "card" }} />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="account" />
        <Stack.Screen name="poster" />
        <Stack.Screen name="upgrade" />
        <Stack.Screen name="redeem" />
      </Stack>
      <AppAlertHost />
    </>
  );
}
