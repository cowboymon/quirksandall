import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

// Mobile sign-in uses a 6-digit email code (OTP) rather than a magic link.
// Deep-linking a magic link back into the app is unreliable in Expo Go and
// fiddly in builds; a code the user types works everywhere.
export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Couldn't send code", error.message);
    } else {
      setStage("code");
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      Alert.alert("That code didn't work", "Check it and try again, or request a new one.");
    } else {
      router.replace("/dashboard");
    }
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
              style={{ borderColor: "#E5BEC4", fontFamily: "Satoshi" }}
              placeholder="your@email.com"
              placeholderTextColor="#987080"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              autoFocus
            />
            <TouchableOpacity
              className="h-[44px] rounded-button items-center justify-center"
              style={{ backgroundColor: "#510000", opacity: loading || !email.trim() ? 0.6 : 1 }}
              onPress={sendCode}
              disabled={loading || !email.trim()}
            >
              <Text className="text-[#F8ECEE] font-semibold text-base">
                {loading ? "Sending…" : "Send sign-in code"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              className="h-[52px] rounded-button border bg-input-bg px-4 text-foreground text-[22px] tracking-[8px] text-center mb-4"
              style={{ borderColor: "#E5BEC4", fontFamily: "Satoshi-Bold" }}
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
              <TouchableOpacity onPress={sendCode} disabled={loading}>
                <Text className="text-primary text-sm font-medium">Resend code</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
