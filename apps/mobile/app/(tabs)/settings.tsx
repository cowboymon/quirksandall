import { View, Text, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { checkEntitlement, purchasePro, restorePurchases } from "../../lib/purchases";
import { colors } from "@quirksandall/shared";
import { Card } from "../../components/ui";
import { useState, useEffect } from "react";

export default function Settings() {
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkEntitlement().then(setIsPaid);
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchasePro();
      if (success) {
        await supabase.from("owners").update({ purchase_status: "paid" }).eq("id", (await supabase.auth.getUser()).data.user!.id);
        setIsPaid(true);
        Alert.alert("Unlocked", "Full access is now active across all your pets.");
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
        await supabase.from("owners").update({ purchase_status: "paid" }).eq("id", (await supabase.auth.getUser()).data.user!.id);
        setIsPaid(true);
        Alert.alert("Restored", "Your purchase has been restored.");
      } else {
        Alert.alert("Nothing to restore", "No previous purchase found for this account.");
      }
    } catch (e: any) {
      Alert.alert("Restore failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text style={{ fontFamily: "Tanker", fontSize: 26, color: colors.textDark, marginBottom: 24 }}>
        Settings
      </Text>

      {!isPaid && (
        <Card style={{ marginBottom: 12, borderColor: colors.accent, borderWidth: 1.5 }}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 15, marginBottom: 4 }}>
            Unlock full access — $7.99
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
            Routine + medications visible to sitters. Multi-pet. Link rotation. Push nudges. One-time, account-wide.
          </Text>
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={loading}
            style={{ height: 44, borderRadius: 10, backgroundColor: colors.button, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#F8ECEE", fontWeight: "600" }}>{loading ? "Working…" : "Unlock for $7.99"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ alignItems: "center", marginTop: 10 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Restore purchases</Text>
          </TouchableOpacity>
        </Card>
      )}

      {isPaid && (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.success, fontWeight: "600" }}>Full access active</Text>
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Restore purchases</Text>
          </TouchableOpacity>
        </Card>
      )}

      <TouchableOpacity onPress={signOut} style={{ marginTop: 8 }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}
