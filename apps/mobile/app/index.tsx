import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
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

  // While the account loads, rotate through a few lines in the app's voice —
  // dead time reads shorter when something's alive on screen. The first line
  // waits 500ms so a fast load never flashes a message for a blink; after
  // that they turn over unhurried.
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const LINES = [
      "Fluffing the pillows…",
      "Counting the treats…",
      "Checking the water bowl…",
      "Warming up the zoomies…",
    ];
    let i = 0;
    const first = setTimeout(() => {
      setMsg(LINES[0]);
      interval = setInterval(() => { i = (i + 1) % LINES.length; setMsg(LINES[i]); }, 1600);
    }, 500);
    let interval: ReturnType<typeof setInterval>;
    return () => { clearTimeout(first); if (interval) clearInterval(interval); };
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#510000" />
      {/* Fixed-height slot so the spinner doesn't jump when the line appears */}
      <Text style={{ height: 22, marginTop: 14, color: "#74555D", fontSize: 14, fontFamily: "Satoshi-Light" }}>
        {msg ?? ""}
      </Text>
    </View>
  );
}
