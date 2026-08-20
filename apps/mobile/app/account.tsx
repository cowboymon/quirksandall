import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Switch, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { AppAlert } from "../stores/appAlert";
import Constants from "expo-constants";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { checkEntitlement, restorePurchases, identifyPurchaser } from "../lib/purchases";
import { REDEMPTION_ENABLED, MARKETING_URL, PRIVACY_URL, TERMS_URL } from "../lib/config";
import { colors, CONSENT_POLICY_VERSION, isUnlocked } from "@quirksandall/shared";
import { Platform } from "react-native";
import { track, resetAnalytics, AnalyticsEvent } from "../lib/analytics";
import { identifyForErrors } from "../lib/errors";
import { Eyebrow, Input } from "../components/ui";
import EditShell from "../components/EditShell";
import ConfirmModal from "../components/ConfirmModal";
import { useRequireAuth } from "../hooks/useRequireAuth";

const SUPPORT_EMAIL = "quirksandall@itshypothetical.com";

export default function Account() {
  useRequireAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  // Subscription period end (owners.expires_at) — null for lifetime/grants.
  // Drives the "Renews …" line; the webhook pushes it forward on renewal.
  const [renewsAt, setRenewsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // null = not yet read from the DB. The toggle stays disabled until we've
  // hydrated the real value, so we never render "off" as if it were authoritative
  // before the source of truth has loaded.
  const [insuranceConsent, setInsuranceConsent] = useState<boolean | null>(null);
  const [marketingConsent, setMarketingConsent] = useState<boolean | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      const { data: owner } = await supabase
        .from("owners")
        .select("name, primary_phone, primary_email, purchase_status, expires_at, consent_insurance_offers, consent_marketing")
        .eq("id", user.id)
        .single();
      setName(owner?.name ?? "");
      setPhone(owner?.primary_phone ?? "");
      setEmail(owner?.primary_email ?? user.email ?? "");
      setIsPaid(isUnlocked(owner));
      setRenewsAt(owner?.expires_at ?? null);
      // Read the consent state back from the source of truth every time the
      // screen opens — reflects changes made on another device or a withdrawal.
      setInsuranceConsent(owner?.consent_insurance_offers ?? false);
      setMarketingConsent(owner?.consent_marketing ?? false);
    })();
    checkEntitlement().then((v) => v && setIsPaid(true)).catch(() => {});
  }, []);

  // Flip a consent: write the current-state column AND append an audit row, both
  // stamped with the policy version. On failure, revert the toggle via `revert`
  // so it keeps matching what's actually stored. Shared by every opt-in.
  const writeConsent = async (
    column: "consent_insurance_offers" | "consent_marketing",
    type: string,
    next: boolean,
    revert: () => void,
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("owners")
      .update({ [column]: next, consent_updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      revert();
      AppAlert.alert("Couldn't save that", error.message);
      return;
    }
    // Append-only audit trail (the current-state write already succeeded).
    await supabase.from("consent_log").insert({
      owner_id: user.id,
      consent_type: type,
      granted: next,
      policy_version: CONSENT_POLICY_VERSION,
    });
  };

  const setInsuranceOffers = (next: boolean) => {
    const prev = insuranceConsent;
    setInsuranceConsent(next);
    writeConsent("consent_insurance_offers", "insurance_offers", next, () => setInsuranceConsent(prev));
  };
  const setMarketing = (next: boolean) => {
    const prev = marketingConsent;
    setMarketingConsent(next);
    writeConsent("consent_marketing", "marketing", next, () => setMarketingConsent(prev));
  };

  const save = async () => {
    // Onboarding requires a phone number upfront (it feeds the missing
    // poster and the PIN-gated contact block) — this screen let it be
    // cleared and saved blank with no check at all.
    if (!phone.trim()) {
      AppAlert.alert("Phone number required", "Add a phone number before saving — it's how sitters and the missing poster reach you.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("owners").update({ name, primary_phone: phone.trim() }).eq("id", user.id);
    }
    setSaving(false);
    router.back();
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await identifyPurchaser(user.id);
      const record = await restorePurchases();
      if (record) {
        track(AnalyticsEvent.PurchaseRestored, { source: "account" });
        if (user) await supabase.from("owners").update(record).eq("id", user.id);
        setIsPaid(true);
        setRenewsAt(record.expires_at);
        AppAlert.alert("Restored", "Your purchase has been restored.");
      } else {
        AppAlert.alert("Nothing to restore", "No previous purchase found for this account.");
      }
    } catch (e: any) {
      AppAlert.alert("Restore failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    resetAnalytics(); // clear identity so the next account isn't merged into this one
    identifyForErrors(null); // same reason, for crash reports
    // scope: "global" (also the library default, made explicit here so it
    // can't silently change) revokes the refresh token server-side, not just
    // locally — signing out actually invalidates the session, not just the
    // on-device copy of it.
    await supabase.auth.signOut({ scope: "global" });
    router.replace("/auth");
  };

  // Support (#4) — opens a mail draft with a little context pre-filled so we
  // know which build it came from. No backend needed.
  const contactSupport = async () => {
    const version = Constants.expoConfig?.version ?? "";
    const subject = encodeURIComponent("Quirks & All — support");
    const body = encodeURIComponent(`\n\n\n———\nSent from Quirks & All ${version} (${Platform.OS})`);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) Linking.openURL(url);
    else AppAlert.alert("No mail app", `Email us at ${SUPPORT_EMAIL}.`);
  };

  // Manage/cancel subscription — Apple (and Google) require this to go
  // through their own subscription-management UI; an app can't cancel an
  // auto-renewing IAP on the user's behalf. This is just a convenience
  // deep link so they don't have to go hunting for it in Settings.
  const manageSubscription = () => {
    const url = Platform.OS === "ios"
      ? "https://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions";
    Linking.openURL(url).catch(() => AppAlert.alert("Couldn't open that", `Manage your subscription in your ${Platform.OS === "ios" ? "iPhone's Settings app" : "Google Play Store app"}.`));
  };

  // Feature request (#97, resolves the open question in #95) — the roadmap now
  // has a real suggestion form, so this no longer needs to go through email.
  // Opens in-app (not the system browser), same as the Privacy/Terms links.
  const openFeatureRequest = () => {
    WebBrowser.openBrowserAsync(`${MARKETING_URL}/roadmap#suggest`);
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
        AppAlert.alert("Couldn't schedule deletion", error.message);
        return;
      }
    }
    resetAnalytics();
    // scope: "global" (also the library default, made explicit here so it
    // can't silently change) revokes the refresh token server-side, not just
    // locally — signing out actually invalidates the session, not just the
    // on-device copy of it.
    await supabase.auth.signOut({ scope: "global" });
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
            <Text style={{ color: colors.textDark, fontSize: 15, fontFamily: "Satoshi-Medium" }}>Product news &amp; tips</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: "Satoshi-Light", marginTop: 3 }}>
              Occasional emails about new features and getting the most out of Quirks &amp; All. Off unless you say so. Change your mind anytime.
            </Text>
          </View>
          <Switch
            value={marketingConsent ?? false}
            onValueChange={setMarketing}
            disabled={marketingConsent === null}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
            style={{ marginTop: 2 }}
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border }}>
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
          <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, lineHeight: 17, fontFamily: "Satoshi-Light", marginTop: 8, marginBottom: 20 }}>
            The full picture — routines and the softer stuff that makes the handoff feel like you. Unlimited pets, too. Pay yearly, cancel anytime.
          </Text>
          <TouchableOpacity onPress={() => router.push("/upgrade")} disabled={loading} activeOpacity={0.85} style={{ height: 44, borderRadius: 10, backgroundColor: "#F8ECEE", alignItems: "center", justifyContent: "center", opacity: loading ? 0.6 : 1 }}>
            <Text style={{ color: "#510000", fontSize: 14, fontFamily: "Satoshi-Medium" }}>See plans</Text>
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
          <Text style={{ color: "#F8ECEE", fontFamily: "Satoshi-Medium", fontSize: 15 }}>You're in. Everything's open.</Text>
          {/* Brighter than body copy — this is live status (when the sub
              actually renews), not disclaimer text, and was reading as the
              same muted grey as everything else in the card. */}
          {renewsAt && !isNaN(new Date(renewsAt).getTime()) && (
            <Text style={{ color: "rgba(248,236,238,0.85)", fontSize: 12, fontFamily: "Satoshi-Medium", marginTop: 4 }}>
              Renews {new Date(renewsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
            </Text>
          )}
          {/* Lifetime purchases have nothing to manage/cancel — renewsAt is
              null for those, so this only shows for an actual subscription.
              Outlined pill, not an underlined text link — this opens the
              App Store's own subscription settings, a real external action
              that deserves a tappable-looking affordance. */}
          {renewsAt && (
            <TouchableOpacity
              onPress={manageSubscription}
              activeOpacity={0.8}
              style={{
                marginTop: 14, alignSelf: "flex-start",
                paddingHorizontal: 16, paddingVertical: 9,
                borderRadius: 999, borderWidth: 1, borderColor: "rgba(248,236,238,0.25)",
              }}
            >
              <Text style={{ color: "#F8ECEE", fontSize: 13, fontFamily: "Satoshi-Medium" }}>Manage subscription</Text>
            </TouchableOpacity>
          )}
          {/* Hairline separates it from Restore below — Manage opens the App
              Store (an external action), Restore re-checks entitlement
              locally (an internal safety net). Different enough actions
              that stacking them as one list read as more related than they
              are. */}
          <View style={{ height: 1, backgroundColor: "rgba(248,236,238,0.12)", marginTop: 16, marginBottom: 12 }} />
          {/* Small, no underline, muted — rarely needed, so it stays quiet
              rather than competing with Manage subscription at the same
              visual weight. */}
          <TouchableOpacity onPress={handleRestore} disabled={loading}>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, fontFamily: "Satoshi" }}>Restore purchases</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Support + Feature request (#97) — two quiet rows above sign out, split
          from the single combined entry now that the roadmap has its own form. */}
      <TouchableOpacity onPress={contactSupport} activeOpacity={0.7} style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
        <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Support</Text>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={openFeatureRequest} activeOpacity={0.7} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
        <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Feature request</Text>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} activeOpacity={0.7} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
        <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Terms of Use</Text>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} activeOpacity={0.7} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
        <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Privacy Policy</Text>
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
