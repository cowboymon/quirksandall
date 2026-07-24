import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "../lib/supabase";
import { purchasePro, restorePurchases } from "../lib/purchases";
import { colors } from "@quirksandall/shared";

const FEATURES = [
  { label: "The soft stuff, too", sub: "Scared of, steers clear of, and what they're really like" },
  { label: "Routine, beyond feeding", sub: "Walks, sleep, and the bathroom routine" },
  { label: "Medications & conditions", sub: "Down to the dose — nothing left to guess" },
  { label: "Unlimited pets", sub: "Add as many as you need" },
  { label: "Rotate share links", sub: "Get a new link whenever you want. The old one won't work again." },
];

export default function Upgrade() {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchasePro();
      if (success) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("owners").update({ purchase_status: "paid" }).eq("id", user!.id);
        Alert.alert(
          "Unlocked.",
          "The full picture is live now — routines, medical, and the softer stuff.",
          [{ text: "Got it", onPress: () => router.back() }]
        );
      }
    } catch (e: any) {
      if (!e.message?.includes("cancel")) Alert.alert("Purchase failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const success = await restorePurchases();
      if (success) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("owners").update({ purchase_status: "paid" }).eq("id", user!.id);
        Alert.alert("Restored", "Full access is back.", [{ text: "Got it", onPress: () => router.back() }]);
      } else {
        Alert.alert("Nothing to restore", "No previous purchase found for this account.");
      }
    } catch (e: any) {
      Alert.alert("Restore failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#510000" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* ── Dark hero ─────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 36 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 36 }}>
            <Text style={{ color: "rgba(248,236,238,0.5)", fontSize: 13, fontFamily: "Satoshi-Medium" }}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={{ fontFamily: "Tanker", fontSize: 42, lineHeight: 42, color: "#F8ECEE", marginBottom: 14 }}>
            Unlock the full picture.
          </Text>
          <Text style={{ color: "rgba(248,236,238,0.7)", fontSize: 15, lineHeight: 22, fontFamily: "Satoshi-Light", marginBottom: 24 }}>
            Routines, medical needs, and the softer stuff that makes the handoff feel less like a stranger and more like you.
          </Text>

          {/* Price pill */}
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "baseline",
              gap: 8,
              backgroundColor: "rgba(248,236,238,0.1)",
              borderWidth: 1,
              borderColor: "rgba(248,236,238,0.2)",
              borderRadius: 999,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontFamily: "Tanker", fontSize: 30, color: "#F8ECEE" }}>$7.99</Text>
            <Text style={{ color: "rgba(248,236,238,0.5)", fontSize: 12, fontFamily: "Satoshi-Light" }}>once, forever</Text>
          </View>
        </View>

        {/* ── Light panel ───────────────────────────── */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#F8ECEE",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 40,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Satoshi-Medium",
              textTransform: "uppercase",
              letterSpacing: 0.7,
              color: colors.textMuted,
              marginBottom: 20,
            }}
          >
            Everything unlocked
          </Text>

          {/* Features */}
          <View style={{ flex: 1 }}>
            {FEATURES.map((f, i) => (
              <View
                key={f.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i < FEATURES.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#510000",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="checkmark" size={13} color="#F8ECEE" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#510000", fontSize: 15, fontFamily: "Satoshi-Medium" }}>{f.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: "Satoshi-Light", marginTop: 3 }}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA footer */}
          <View style={{ marginTop: 28, alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 12,
                backgroundColor: "#510000",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: "#F8ECEE", fontSize: 15, fontFamily: "Satoshi-Medium", letterSpacing: 0.3 }}>
                {loading ? "Working…" : "Unlock for $7.99"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ paddingVertical: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Restore purchases</Text>
            </TouchableOpacity>

            <Text style={{ color: "rgba(152,112,128,0.6)", fontSize: 10, fontFamily: "Satoshi-Light", textAlign: "center", lineHeight: 15 }}>
              Charged to your App Store / Google Play account. Unlocks account-wide — every pet you add, covered.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
