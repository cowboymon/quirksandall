// Code redemption — UI only for now. The backend (a redemption_codes table +
// a validate-code Supabase Edge Function that grants a RevenueCat Promotional
// Entitlement) isn't built yet, so submitting a code shows a "not active yet"
// message. When the flow ships, replace handleRedeem's body with the Edge
// Function call.
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { AppAlert } from "../stores/appAlert";
import { router } from "expo-router";
import { colors } from "@quirksandall/shared";
import { usePrices } from "../hooks/usePrices";

export default function Redeem() {
  const prices = usePrices();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    // TODO: call the validate-code Edge Function → RevenueCat Promotional
    // Entitlement. Non-functional until that backend exists.
    setTimeout(() => {
      setLoading(false);
      AppAlert.alert(
        "Not active yet",
        "Code redemption is coming soon — it's how group and partner licences will work. Thanks for your patience.",
      );
    }, 400);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 40 }}
    >
      <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ marginBottom: 28 }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={{ fontFamily: "Tanker", fontSize: 34, lineHeight: 40, color: colors.textDark }}>
        Have a code?
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24, fontFamily: "Satoshi-Light" }}>
        Got a code from a breeder, rescue, or partner? Enter it here to unlock full access.
      </Text>

      <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.textMuted, marginBottom: 6 }}>
        Your code
      </Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="e.g. LITTER-2026"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        style={{
          minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
          backgroundColor: "#FFFFFF", paddingHorizontal: 16, fontSize: 16,
          fontFamily: "Satoshi-Medium", color: colors.textDark, letterSpacing: 1,
        }}
      />

      <TouchableOpacity
        onPress={handleRedeem}
        disabled={loading || !code.trim()}
        activeOpacity={0.85}
        style={{
          marginTop: 20, height: 50, borderRadius: 12, backgroundColor: colors.button,
          alignItems: "center", justifyContent: "center", opacity: loading || !code.trim() ? 0.4 : 1,
        }}
      >
        <Text style={{ color: colors.buttonText, fontSize: 15, fontFamily: "Satoshi-Medium", letterSpacing: 0.3 }}>
          {loading ? "Checking…" : "Redeem code"}
        </Text>
      </TouchableOpacity>

      <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 16, fontFamily: "Satoshi-Light" }}>
        No code? Head back and unlock for {prices.annual} a year.
      </Text>
    </ScrollView>
  );
}
