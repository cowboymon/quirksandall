import { useEffect } from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { initAnalytics, identify, track, AnalyticsEvent } from "../lib/analytics";
import { CONSENT_POLICY_VERSION } from "@quirksandall/shared";

export default function Index() {
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Attribute events to this owner once analytics is ready. This is the
        // "app reopened with an existing session" path — the counterpart to
        // auth.tsx's session_started on a fresh login, so returning-user opens
        // are counted too (this is what "did we see a login event" was missing).
        initAnalytics().then(() => {
          identify(session.user.id);
          track(AnalyticsEvent.SessionStarted, { platform: Platform.OS, source: "resume" });
        });
        // Same required-agreement gate as auth.tsx (#96) — covers accounts that
        // predate this gate, whose terms_accepted_at is still null, and anyone
        // who resumes an existing session after a policy version bump.
        const { data: owner } = await supabase
          .from("owners")
          .select("terms_accepted_at, terms_policy_version")
          .eq("id", session.user.id)
          .single();
        const upToDate = !!owner?.terms_accepted_at && owner.terms_policy_version === CONSENT_POLICY_VERSION;
        router.replace(upToDate ? "/dashboard" : "/accept-terms");
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
