import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { initRevenueCat } from "../lib/purchases";
import { configureNotifications, registerForPushNotifications } from "../lib/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Tanker: require("../assets/fonts/Tanker-Regular.ttf"),
    Satoshi: require("../assets/fonts/Satoshi-Regular.ttf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      initRevenueCat();
      configureNotifications();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F8ECEE" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="auth-callback" options={{ animation: "none" }} />
      <Stack.Screen name="onboarding" options={{ presentation: "card" }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="poster" />
    </Stack>
  );
}
