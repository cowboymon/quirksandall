import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { splashHidden } from "../lib/splash";
import { AppAlert } from "../stores/appAlert";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import { initAnalytics, identify, setUserProps, track, AnalyticsEvent } from "../lib/analytics";
import { CONSENT_POLICY_VERSION } from "@quirksandall/shared";

// Client-side-only cooldown between OTP sends. This is UX, not real
// protection — the actual rate limit is Supabase's own server-side GoTrue
// throttle, which this app doesn't control or see the config for. What this
// DOES do: stop someone from mashing "Resend code" and burning through
// Supabase's own limit (and their inbox) in a few seconds, and give a clear
// "try again in Ns" signal instead of a bare error once they do hit it.
const RESEND_COOLDOWN_SECONDS = 30;

// Mobile sign-in uses a 6-digit email code (OTP) rather than a magic link.
// Deep-linking a magic link back into the app is unreliable in Expo Go and
// fiddly in builds; a code the user types works everywhere.
export default function AuthScreen() {
  const emailRef = useRef<TextInput>(null);
  // Focus only once the splash is gone — autoFocus fired while this screen
  // sat under the held splash, raising the keyboard before anything visible.
  useEffect(() => {
    let active = true;
    splashHidden.then(() => { if (active) setTimeout(() => emailRef.current?.focus(), 80); });
    return () => { active = false; };
  }, []);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Bumped whenever the screen regains focus so the code field remounts fresh —
  // iOS otherwise shows the alpha keyboard on refocus instead of the numeric one
  // the field asks for (keyboardType only reliably applies on mount).
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => { setFocusKey((k) => k + 1); }, []));

  useEffect(() => {
    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    };
  }, []);

  const startCooldown = () => {
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownInterval.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && cooldownInterval.current) clearInterval(cooldownInterval.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const sendCode = async () => {
    if (!email.trim() || cooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      console.error("sendCode raw error:", error.name, error.message, JSON.stringify(error));
      // Generic on purpose — Supabase's own error text can otherwise hint at
      // account state (e.g. distinguishing rate-limit vs. other failures in
      // ways that add up to an email-enumeration signal across repeated
      // requests). The one exception worth surfacing is the rate limit itself,
      // since "try again in a bit" is actionable and reveals nothing about
      // whether the email is registered.
      const isRateLimited = /rate limit/i.test(error.message);
      if (isRateLimited) startCooldown();
      AppAlert.alert(
        "Couldn't send code",
        isRateLimited ? "Too many attempts — please wait a bit and try again." : "Something went wrong. Please try again."
      );
    } else {
      startCooldown();
      setStage("code");
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 6) return;
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      AppAlert.alert("That code didn't work", "Check it and try again, or request a new one.");
      return;
    }
    // Identity + funnel: identify everyone; fire sign_up_completed only for a
    // brand-new account (created within the last minute), AFTER identify so
    // it's attributed correctly.
    const user = data.user;
    if (user) {
      await initAnalytics();
      identify(user.id);
      const isNew = !!user.created_at && Date.now() - new Date(user.created_at).getTime() < 60_000;
      if (isNew) {
        setUserProps({ signup_platform: Platform.OS });
        track(AnalyticsEvent.SignUpCompleted, { platform: Platform.OS, sign_up_method: "otp" });
      }
      // Every authenticated app entry — new signup or returning login — is a
      // session. This is the "did they come back" signal separate from
      // sign_up_completed (which only fires once, ever, per account).
      track(AnalyticsEvent.SessionStarted, { platform: Platform.OS, source: "login" });
    }

    // Required legal-agreement gate (#96) — recorded once per account, checked
    // here rather than on this screen, since we can't tell new vs. returning
    // apart until after verification. A returning user who already accepted the
    // current policy version skips straight past it; only a brand-new account,
    // or an acceptance that predates a policy bump, gets routed there.
    const { data: owner } = await supabase
      .from("owners")
      .select("terms_accepted_at, terms_policy_version")
      .eq("id", user!.id)
      .single();
    const upToDate = !!owner?.terms_accepted_at && owner.terms_policy_version === CONSENT_POLICY_VERSION;
    router.replace(upToDate ? "/dashboard" : "/accept-terms");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background px-6"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center">
        <Text className="text-foreground text-[34px] leading-tight mb-2" style={{ fontFamily: "Tanker" }}>
          Away, but known.
        </Text>
        <Text className="text-text-muted text-sm mb-10 leading-relaxed">
          {stage === "email"
            ? "Enter your email to sign in or create an account."
            : `Enter the 6-digit code we sent to ${email}.`}
        </Text>

        {stage === "email" ? (
          <>
            <TextInput
              className="h-[44px] rounded-button border bg-input-bg px-4 text-foreground text-base mb-4"
              style={{ borderColor: "#E5BEC4", letterSpacing: 0, fontFamily: "Satoshi" }}
              placeholder="your@email.com"
              placeholderTextColor="#987080"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              ref={emailRef}
            />
            <TouchableOpacity
              className="h-[44px] rounded-button items-center justify-center mt-5"
              style={{ backgroundColor: "#510000", opacity: loading || cooldown > 0 || !email.trim() ? 0.6 : 1 }}
              onPress={sendCode}
              disabled={loading || cooldown > 0 || !email.trim()}
            >
              <Text className="text-[#F8ECEE] font-semibold text-base">
                {loading ? "Sending…" : cooldown > 0 ? `Try again in ${cooldown}s` : "Send sign-in code"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              key={`otp-${focusKey}`}
              className="h-[52px] rounded-button border bg-input-bg px-4 text-foreground text-[22px] tracking-[8px] text-center mb-4"
              style={{ borderColor: "#E5BEC4", letterSpacing: 0, fontFamily: "Satoshi-Bold" }}
              placeholder="000000"
              placeholderTextColor="#C9A3AC"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              className="h-[44px] rounded-button items-center justify-center"
              style={{ backgroundColor: "#510000", opacity: loading || code.length < 6 ? 0.6 : 1 }}
              onPress={verifyCode}
              disabled={loading || code.length < 6}
            >
              <Text className="text-[#F8ECEE] font-semibold text-base">
                {loading ? "Verifying…" : "Verify & sign in"}
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity onPress={() => { setStage("email"); setCode(""); }}>
                <Text className="text-text-muted text-sm">Change email</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendCode} disabled={loading || cooldown > 0}>
                <Text className="text-primary text-sm font-medium" style={{ opacity: cooldown > 0 ? 0.5 : 1 }}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
