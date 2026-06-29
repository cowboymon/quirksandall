// Handles the magic-link deep link: quirksandall://auth-callback#access_token=...
// Expo Router intercepts the scheme redirect and lands here.
import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import { colors } from "@quirksandall/shared";

export default function AuthCallback() {
  // Expo Router parses the fragment as query params when using hash-based tokens
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string; error?: string }>();

  useEffect(() => {
    (async () => {
      const { access_token, refresh_token, error } = params;

      if (error) {
        // Expired or already-used link — go back to auth so they can request a new one
        router.replace("/auth");
        return;
      }

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }

      // Regardless, check current session and route accordingly
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/(tabs)/dashboard");
      } else {
        router.replace("/auth");
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#FBF4E8", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>Signing you in…</Text>
    </View>
  );
}
