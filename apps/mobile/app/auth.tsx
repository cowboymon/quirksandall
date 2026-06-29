import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: "quirksandall://auth-callback" },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Couldn't send link", error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background px-6"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center">
        <Text className="text-primary text-[34px] leading-tight mb-2" style={{ fontFamily: "Spectral_700BoldItalic" }}>
          Away, but known.
        </Text>
        <Text className="text-text-muted text-sm mb-10 leading-relaxed">
          Enter your email to sign in or create an account.
        </Text>

        {sent ? (
          <View>
            <Text className="text-primary font-semibold text-base mb-2">Check your email.</Text>
            <Text className="text-text-muted text-sm leading-relaxed">
              We sent a link to {email}. Tap it to sign in — no password needed.
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              className="h-[44px] rounded-button border bg-input-bg px-4 text-primary text-base mb-4"
              style={{ borderColor: "#E8DCC8" }}
              placeholder="your@email.com"
              placeholderTextColor="#8A7A72"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
            <TouchableOpacity
              className="h-[44px] rounded-button items-center justify-center"
              style={{ backgroundColor: "#4A2E3D", opacity: loading ? 0.6 : 1 }}
              onPress={sendMagicLink}
              disabled={loading || !email.trim()}
            >
              <Text className="text-[#F7E9C9] font-semibold text-base">
                {loading ? "Sending…" : "Send sign-in link"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
