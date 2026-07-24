import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { checkEntitlement, purchasePro, restorePurchases } from "../lib/purchases";
import { colors } from "@quirksandall/shared";
import { Eyebrow, Input } from "../components/ui";
import EditShell from "../components/EditShell";

const SUPPORT_EMAIL = "quirksandall@itshypothetical.com";

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

  const deleteAccount = () => {
    Alert.alert(
      "Delete your account?",
      "Your profile and every pet's details stay recoverable for 30 days — sign back in any time before then to cancel. After that, everything is permanently deleted.",
      [
        { text: "Keep my account", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { error } = await supabase
                .from("owners")
                .update({ deletion_scheduled_at: new Date().toISOString() })
                .eq("id", user.id);
              if (error) {
                Alert.alert("Couldn't schedule deletion", error.message);
                return;
              }
            }
            await supabase.auth.signOut();
            router.replace("/auth");
          },
        },
      ]
    );
  };

  return (
    <EditShell
      title="Your Details"
      subtitle="Shown on missing posters and used to recover your profile. Never shared with sitters."
      onSave={save}
      saving={saving}
    >
      <View style={{ gap: 16 }}>
        <View>
          <Eyebrow>Your name</Eyebrow>
          <Input style={{ marginTop: 4 }} placeholder="e.g. Jamie Nguyen" value={name} onChangeText={setName} />
        </View>
        <View>
          <Eyebrow>Mobile number</Eyebrow>
          <Input style={{ marginTop: 4 }} placeholder="e.g. 0412 345 678" phone keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
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
          Changing your email requires contacting support at{" "}
          <Text style={{ color: colors.textDark, fontFamily: "Satoshi-Medium" }}>{SUPPORT_EMAIL}</Text>
        </Text>
      </View>

      {/* Unlock module — dark card, matching the paywall hero */}
      {!isPaid ? (
        <View style={{ marginTop: 24, backgroundColor: "#510000", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 20 }}>
          <Text style={{ fontFamily: "Tanker", fontSize: 26, lineHeight: 26, color: "#F8ECEE" }}>
            Unlock full access.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 8, marginBottom: 16 }}>
            <Text style={{ fontFamily: "Tanker", fontSize: 20, lineHeight: 20, color: "#F8ECEE" }}>$7.99</Text>
            <Text style={{ color: "rgba(248,236,238,0.5)", fontSize: 11, fontFamily: "Satoshi-Light" }}>once, forever</Text>
          </View>
          <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, lineHeight: 17, fontFamily: "Satoshi-Light", marginBottom: 20 }}>
            The full picture — routines, medical needs, and the softer stuff that makes the handoff feel like you. Unlimited pets, too.
          </Text>
          <TouchableOpacity onPress={handlePurchase} disabled={loading} activeOpacity={0.85} style={{ height: 44, borderRadius: 10, backgroundColor: "#F8ECEE", alignItems: "center", justifyContent: "center", opacity: loading ? 0.6 : 1 }}>
            <Text style={{ color: "#510000", fontSize: 14, fontFamily: "Satoshi-Medium" }}>{loading ? "Working…" : "Unlock for $7.99"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ alignItems: "center", marginTop: 10, paddingVertical: 4 }}>
            <Text style={{ color: "rgba(248,236,238,0.4)", fontSize: 12, fontFamily: "Satoshi" }}>Restore purchases</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginTop: 24, backgroundColor: "#510000", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 20 }}>
          <Text style={{ color: "#F8ECEE", fontFamily: "Satoshi-Medium", fontSize: 15 }}>Full access active</Text>
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ marginTop: 8 }}>
            <Text style={{ color: "rgba(248,236,238,0.4)", fontSize: 12, fontFamily: "Satoshi" }}>Restore purchases</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign out — promoted to the primary "Save"-style button */}
      <TouchableOpacity
        onPress={signOut}
        activeOpacity={0.85}
        style={{ marginTop: 28, height: 50, borderRadius: 12, backgroundColor: "#510000", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "#F8ECEE", fontSize: 15, fontFamily: "Satoshi-Medium", letterSpacing: 0.3 }}>Sign out</Text>
      </TouchableOpacity>

      {/* Delete account — takes the outlined treatment Sign out used to have (#69),
          a clear standalone button directly beneath the primary Sign out. */}
      <TouchableOpacity
        onPress={deleteAccount}
        activeOpacity={0.85}
        style={{ marginTop: 14, height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.danger, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: colors.danger, fontSize: 15, fontFamily: "Satoshi-Medium", letterSpacing: 0.3 }}>Delete account</Text>
      </TouchableOpacity>
    </EditShell>
  );
}
