import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { policyRoute } from "../lib/policy";
import { initAnalytics, identify, track, AnalyticsEvent } from "../lib/analytics";

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
        // predate the gate and have no acceptance rows at all, and anyone who
        // resumes an existing session after a policy version bump.
        router.replace(await policyRoute(session.user.id));
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
    // Species-agnostic where possible, and where not, alternating dog and
    // cat energy — a cat owner should feel seen by the second line.
    const LINES = [
      "Fluffing the pillows…",
      "Counting the treats…",
      "Finding the sunny spot…",
      "Warming up the zoomies…",
      "Rattling the biscuit tin…",
      "Chasing the red dot…",
      "Checking the water bowl…",
      "Circling before settling…",
      "Knocking things off the shelf…",
      "Sniffing everything twice…",
      "Judging you, affectionately…",
      "Untangling the leads…",
    ];
    // Start somewhere random each launch — a fixed order means everyone only
    // ever sees the first two or three lines and the rest of the list is
    // dead weight. Still rotates in sequence from there, so no repeats
    // within a single load.
    let i = Math.floor(Math.random() * LINES.length);
    const first = setTimeout(() => {
      setMsg(LINES[i]);
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
