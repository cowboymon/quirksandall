import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Spectral_700BoldItalic } from "@expo-google-fonts/spectral";
import { initRevenueCat } from "../lib/purchases";
import { configureNotifications, registerForPushNotifications } from "../lib/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Spectral_700BoldItalic });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      initRevenueCat();
      configureNotifications();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FBF4E8" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="auth-callback" options={{ animation: "none" }} />
      <Stack.Screen name="onboarding" options={{ presentation: "card" }} />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
