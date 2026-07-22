import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { checkEntitlement, purchasePro, restorePurchases } from "../lib/purchases";
import { colors } from "@quirksandall/shared";
import { Eyebrow, Input, Card } from "../components/ui";

const SUPPORT_EMAIL = "hello@itshypothetical.com";

export default function Account() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      const { data: owner } = await supabase
        .from("owners")
        .select("name, primary_phone, primary_email, purchase_status")
        .eq("id", user.id)
        .single();
      setName(owner?.name ?? "");
      setPhone(owner?.primary_phone ?? "");
      setEmail(owner?.primary_email ?? user.email ?? "");
      setIsPaid(owner?.purchase_status === "paid");
    })();
    checkEntitlement().then((v) => v && setIsPaid(true)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("owners").update({ name, primary_phone: phone }).eq("id", user.id);
    }
    setSaving(false);
    router.back();
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      if (await purchasePro()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from("owners").update({ purchase_status: "paid" }).eq("id", user.id);
        setIsPaid(true);
        Alert.alert("Unlocked", "Full access is now active across all your pets.");
      }
    } catch (e: any) {
      if (!e.message?.toLowerCase().includes("cancel")) Alert.alert("Purchase failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      if (await restorePurchases()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from("owners").update({ purchase_status: "paid" }).eq("id", user.id);
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
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 52, paddingBottom: 40, paddingHorizontal: 24 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28 }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>← Dashboard</Text>
      </TouchableOpacity>

      <Eyebrow>Account</Eyebrow>
      <Text style={{ fontFamily: "Tanker", fontSize: 34, lineHeight: 40, color: colors.textDark, marginTop: 6 }}>Your details.</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8, lineHeight: 21, fontFamily: "Satoshi-Light" }}>
        Shown on missing posters and used to recover your profile. Never shared with sitters.
      </Text>

      <View style={{ marginTop: 20, gap: 16 }}>
        <View>
          <Eyebrow>Your name</Eyebrow>
          <Input style={{ marginTop: 4 }} placeholder="e.g. Jamie Nguyen" value={name} onChangeText={setName} />
        </View>
        <View>
          <Eyebrow>Mobile number</Eyebrow>
          <Input style={{ marginTop: 4 }} placeholder="e.g. 0412 345 678" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        </View>
        <View>
          <Eyebrow>Email address</Eyebrow>
          <Input style={{ marginTop: 4, opacity: 0.6 }} value={email} editable={false} />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6, fontFamily: "Satoshi-Light" }}>
            Used to recover your profile. Never visible to sitters.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, fontFamily: "Satoshi-Light" }}>
          Deleting your account or changing your email requires contacting support at{" "}
          <Text style={{ color: colors.textDark, fontFamily: "Satoshi-Medium" }}>{SUPPORT_EMAIL}</Text>
        </Text>
      </View>

      {/* Purchase */}
      {!isPaid ? (
        <Card style={{ marginTop: 20, borderColor: colors.primary, borderWidth: 1.5 }}>
          <Text style={{ color: colors.primary, fontFamily: "Satoshi-Bold", fontSize: 15, marginBottom: 4 }}>Unlock full access — $7.99</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 14, fontFamily: "Satoshi-Light" }}>
            Routine + medications visible to sitters. Multi-pet. Push nudges. One-time, account-wide.
          </Text>
          <TouchableOpacity onPress={handlePurchase} disabled={loading} style={{ height: 46, borderRadius: 10, backgroundColor: colors.button, alignItems: "center", justifyContent: "center", opacity: loading ? 0.6 : 1 }}>
            <Text style={{ color: colors.buttonText, fontFamily: "Satoshi-Medium", fontSize: 15 }}>{loading ? "Working…" : "Unlock for $7.99"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ alignItems: "center", marginTop: 10 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Restore purchases</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <Card style={{ marginTop: 20 }}>
          <Text style={{ color: colors.success, fontFamily: "Satoshi-Medium" }}>Full access active</Text>
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Restore purchases</Text>
          </TouchableOpacity>
        </Card>
      )}

      <TouchableOpacity onPress={save} disabled={saving} style={{ marginTop: 24, height: 48, borderRadius: 10, backgroundColor: colors.button, alignItems: "center", justifyContent: "center" }}>
        {saving ? <ActivityIndicator color={colors.buttonText} /> : <Text style={{ color: colors.buttonText, fontFamily: "Satoshi-Medium", fontSize: 15 }}>Save</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut} style={{ marginTop: 20, alignItems: "center" }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
