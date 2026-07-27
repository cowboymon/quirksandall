import { useEffect } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { initAnalytics, identify, track, AnalyticsEvent } from "../lib/analytics";

export default function Index() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Attribute events to this owner once analytics is ready. This is the
        // "app reopened with an existing session" path — the counterpart to
        // auth.tsx's session_started on a fresh login, so returning-user opens
        // are counted too (this is what "did we see a login event" was missing).
        initAnalytics().then(() => {
          identify(session.user.id);
          track(AnalyticsEvent.SessionStarted, { platform: Platform.OS, source: "resume" });
        });
        router.replace("/dashboard");
      } else {
        router.replace("/auth");
      }
    });
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#510000" />
    </View>
  );
}
