import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import Entypo from "@expo/vector-icons/Entypo";
import { initRevenueCat } from "../lib/purchases";
import { configureNotifications, registerForPushNotifications } from "../lib/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Tanker: require("../assets/fonts/Tanker-Regular.ttf"),
    Satoshi: require("../assets/fonts/Satoshi-Regular.ttf"),
    "Satoshi-Light": require("../assets/fonts/Satoshi-Light.ttf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.ttf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.ttf"),
    // Preload the icon-set fonts too — the app gates all rendering on
    // fontsLoaded, and lazily-loaded vector-icon fonts (esp. a newly added set
    // like Entypo) can otherwise render blank on first paint.
    ...Ionicons.font,
    ...Entypo.font,
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
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="account" />
      <Stack.Screen name="poster" />
      <Stack.Screen name="upgrade" />
    </Stack>
  );
}
