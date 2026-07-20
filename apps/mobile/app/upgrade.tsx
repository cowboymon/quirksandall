import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { purchasePro, restorePurchases } from "../lib/purchases";
import { colors } from "@quirksandall/shared";

const FEATURES = [
  { label: "Routine visible to sitters", note: "Feeding, walks, sleep, bathroom" },
  { label: "Medications & conditions visible", note: "With location stored" },
  { label: "Multi-pet", note: "Add as many pets as you need" },
  { label: "Rotate share link", note: "Generate a fresh token, old one invalidated" },
  { label: "Push nudges", note: "Trick-reinforcement reminders" },
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
          "Routine's saved. Sitters can see the full day now.",
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
    <ScrollView style={{ flex: 1, backgroundColor: "#F8ECEE" }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
        <Text style={{ color: colors.textMuted, fontSize: 15 }}>‹ Back</Text>
      </TouchableOpacity>

      <Text
        style={{ fontFamily: "Tanker", fontSize: 30, color: colors.textDark, lineHeight: 36, marginBottom: 8 }}
      >
        Routine's saved.{"\n"}Unlock it so sitters{"\n"}get the full day.
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 28 }}>
        One payment, all your pets, forever. No subscription.
      </Text>

      {/* Feature list */}
      <View style={{ gap: 10, marginBottom: 28 }}>
        {FEATURES.map((f) => (
          <View key={f.label} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <Text style={{ color: colors.success, fontSize: 16, marginTop: 1 }}>✓</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>{f.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>{f.note}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Purchase button */}
      <TouchableOpacity
        onPress={handlePurchase}
        disabled={loading}
        style={{
          height: 52,
          borderRadius: 10,
          backgroundColor: loading ? colors.dashedBorder : colors.button,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#F8ECEE", fontWeight: "700", fontSize: 16 }}>
          {loading ? "Working…" : "Unlock for $7.99"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ alignItems: "center", paddingVertical: 10 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Restore purchases</Text>
      </TouchableOpacity>

      <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 }}>
        Payment is charged to your App Store / Google Play account. Unlocks account-wide — works on any pet you add.
      </Text>
    </ScrollView>
  );
}
