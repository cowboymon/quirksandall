import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, Switch, Linking } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { checkEntitlement, purchasePro, restorePurchases } from "../lib/purchases";
import { REDEMPTION_ENABLED } from "../lib/config";
import { colors, PRICE, CONSENT_POLICY_VERSION } from "@quirksandall/shared";
import { Platform } from "react-native";
import { track, resetAnalytics, AnalyticsEvent } from "../lib/analytics";
import { Eyebrow, Input } from "../components/ui";
import EditShell from "../components/EditShell";
import ConfirmModal from "../components/ConfirmModal";

const SUPPORT_EMAIL = "quirksandall@itshypothetical.com";

export default function Account() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // null = not yet read from the DB. The toggle stays disabled until we've
  // hydrated the real value, so we never render "off" as if it were authoritative
  // before the source of truth has loaded.
  const [insuranceConsent, setInsuranceConsent] = useState<boolean | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      const { data: owner } = await supabase
        .from("owners")
        .select("name, primary_phone, primary_email, purchase_status, consent_insurance_offers")
        .eq("id", user.id)
        .single();
      setName(owner?.name ?? "");
      setPhone(owner?.primary_phone ?? "");
      setEmail(owner?.primary_email ?? user.email ?? "");
      setIsPaid(owner?.purchase_status === "paid");
      // Read the consent state back from the source of truth every time the
      // screen opens — reflects changes made on another device or a withdrawal.
      setInsuranceConsent(owner?.consent_insurance_offers ?? false);
    })();
    checkEntitlement().then((v) => v && setIsPaid(true)).catch(() => {});
  }, []);

  // Flip consent: writes the current-state column AND appends an audit row, both
  // stamped with the policy version. On failure, revert the toggle so it keeps
  // matching what's actually stored.
  const setInsuranceOffers = async (next: boolean) => {
    const prev = insuranceConsent;
    setInsuranceConsent(next);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("owners")
      .update({
        consent_insurance_offers: next,
        consent_updated_at: new Date().toISOString(),
        consent_policy_version: CONSENT_POLICY_VERSION,
      })
      .eq("id", user.id);
    if (error) {
      setInsuranceConsent(prev);
      Alert.alert("Couldn't save that", error.message);
      return;
    }
    // Append-only audit trail. A failure here isn't surfaced to the user (the
    // current-state write already succeeded), but it should be rare.
    await supabase.from("consent_log").insert({
      owner_id: user.id,
      consent_type: "insurance_offers",
      granted: next,
      policy_version: CONSENT_POLICY_VERSION,
    });
  };

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
    track(AnalyticsEvent.PurchaseStarted, { source: "account" });
    try {
      if (await purchasePro()) {
        track(AnalyticsEvent.PurchaseCompleted, { source: "account" });
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
        track(AnalyticsEvent.PurchaseRestored, { source: "account" });
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
    resetAnalytics(); // clear identity so the next account isn't merged into this one
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  // Feedback / feature requests (#95) — opens a mail draft with a little context
  // pre-filled so we know which build it came from. No backend needed.
  const sendFeedback = async () => {
    const version = Constants.expoConfig?.version ?? "";
    const subject = encodeURIComponent("Quirks & All — feedback");
    const body = encodeURIComponent(`\n\n\n———\nSent from Quirks & All ${version} (${Platform.OS})`);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) Linking.openURL(url);
    else Alert.alert("No mail app", `Email us at ${SUPPORT_EMAIL}.`);
  };

  const doDeleteAccount = async () => {
    setShowDeleteAccount(false);
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
    resetAnalytics();
    await supabase.auth.signOut();
    router.replace("/auth");
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
          <Input name style={{ marginTop: 4 }} placeholder="e.g. Jamie Nguyen" value={name} onChangeText={setName} />
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

      {/* Consent (Spec §8.4) — own section, plain register (not deadpan). Opt-in,
          off by default, revocable in one tap. The toggle reflects the value
          stored in the DB, hydrated on open. */}
      <View style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text style={{ fontSize: 11, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.7, color: colors.textMuted }}>
          What we can contact you about
        </Text>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 15, fontFamily: "Satoshi-Medium" }}>Insurance offers</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: "Satoshi-Light", marginTop: 3 }}>
              Occasional offers from pet insurance partners, matched to your pet's details. Off unless you say so. Change your mind anytime.
            </Text>
          </View>
          <Switch
            value={insuranceConsent ?? false}
            onValueChange={setInsuranceOffers}
            disabled={insuranceConsent === null}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
            style={{ marginTop: 2 }}
          />
        </View>
      </View>

      {/* Unlock module — dark card, matching the paywall hero */}
      {!isPaid ? (
        <View style={{ marginTop: 24, backgroundColor: "#510000", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 20 }}>
          <Text style={{ fontFamily: "Tanker", fontSize: 26, lineHeight: 26, color: "#F8ECEE" }}>
            Unlock full access.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 8, marginBottom: 16 }}>
            <Text style={{ fontFamily: "Tanker", fontSize: 20, lineHeight: 20, color: "#F8ECEE" }}>{PRICE}</Text>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 11, fontFamily: "Satoshi-Light" }}>once, forever</Text>
          </View>
          <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, lineHeight: 17, fontFamily: "Satoshi-Light", marginBottom: 20 }}>
            The full picture — routines and the softer stuff that makes the handoff feel like you. Unlimited pets, too.
          </Text>
          <TouchableOpacity onPress={handlePurchase} disabled={loading} activeOpacity={0.85} style={{ height: 44, borderRadius: 10, backgroundColor: "#F8ECEE", alignItems: "center", justifyContent: "center", opacity: loading ? 0.6 : 1 }}>
            <Text style={{ color: "#510000", fontSize: 14, fontFamily: "Satoshi-Medium" }}>{loading ? "Working…" : `Unlock for ${PRICE}`}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ alignItems: "center", marginTop: 10, paddingVertical: 4 }}>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, fontFamily: "Satoshi" }}>Restore purchases</Text>
          </TouchableOpacity>
          {REDEMPTION_ENABLED && (
            <TouchableOpacity onPress={() => router.push("/redeem")} style={{ alignItems: "center", marginTop: 8, paddingVertical: 4 }}>
              <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, fontFamily: "Satoshi" }}>Have a code?</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 24, backgroundColor: "#510000", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 20 }}>
          <Text style={{ color: "#F8ECEE", fontFamily: "Satoshi-Medium", fontSize: 15 }}>You're in. For good.</Text>
          <TouchableOpacity onPress={handleRestore} disabled={loading} style={{ marginTop: 8 }}>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, fontFamily: "Satoshi" }}>Restore purchases</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback / feature request (#95) — quiet row above sign out. */}
      <TouchableOpacity onPress={sendFeedback} activeOpacity={0.7} style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
        <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Send feedback or a feature request</Text>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>›</Text>
      </TouchableOpacity>

      {/* Sign out — outlined standalone button (the treatment Delete used to have). */}
      <TouchableOpacity
        onPress={signOut}
        activeOpacity={0.85}
        style={{ marginTop: 16, height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.textDark, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: colors.textDark, fontSize: 15, fontFamily: "Satoshi-Medium", letterSpacing: 0.3 }}>Sign out</Text>
      </TouchableOpacity>

      {/* Delete account — the quiet text link, beneath Sign out. */}
      <TouchableOpacity onPress={() => setShowDeleteAccount(true)} style={{ marginTop: 14, alignItems: "center", paddingVertical: 6 }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>Delete account</Text>
      </TouchableOpacity>

      <ConfirmModal
        visible={showDeleteAccount}
        title="Delete your account?"
        message="Your profile and every pet's details stay recoverable for 30 days — sign back in any time before then to cancel. After that, everything is permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Keep my account"
        destructive
        onConfirm={doDeleteAccount}
        onCancel={() => setShowDeleteAccount(false)}
      />
    </EditShell>
  );
}
