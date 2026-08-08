// Required legal-agreement gate (#96) — shown once per account, right after
// sign-in verification, only when the owner hasn't yet accepted the current
// Privacy Policy / Terms of Use (or accepted an older policy version). A
// returning user with a current acceptance never lands here; auth.tsx routes
// straight past it.
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { AppAlert } from "../stores/appAlert";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { PRIVACY_URL, TERMS_URL } from "../lib/config";
import { CONSENT_POLICY_VERSION, PRIVACY_POLICY_VERSION, TERMS_VERSION } from "@quirksandall/shared";
import CheckboxRow from "../components/CheckboxRow";

export default function AcceptTerms() {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      // Safety net for anyone who lands here directly with an already-current
      // acceptance (e.g. a stale deep link) — skip straight past.
      const { data: owner } = await supabase
        .from("owners")
        .select("terms_accepted_at, terms_policy_version")
        .eq("id", user.id)
        .single();
      if (owner?.terms_accepted_at && owner.terms_policy_version === CONSENT_POLICY_VERSION) {
        router.replace("/dashboard");
        return;
      }
      setLoading(false);
    })();
  }, []);

  const accept = async () => {
    if (!agreed || saving) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("owners")
        .update({ terms_accepted_at: now, terms_policy_version: CONSENT_POLICY_VERSION })
        .eq("id", user.id);
      if (error) throw error;
      await supabase.from("consent_log").insert({
        owner_id: user.id,
        consent_type: "terms",
        granted: true,
        policy_version: CONSENT_POLICY_VERSION,
      });
      // Build 23 (#96 follow-up): per-policy-type acceptance record, separate
      // from the terms_accepted_at/consent_log write above so Privacy and
      // Terms can version independently later. A failed insert here must not
      // let signup proceed as if consent were recorded — throwing keeps this
      // inside the try block, so the catch below blocks navigation and
      // surfaces the error instead of silently continuing to /dashboard.
      const { error: policyError } = await supabase.from("policy_acceptances").insert([
        { user_id: user.id, policy_type: "privacy_policy", version: PRIVACY_POLICY_VERSION, method: "signup" },
        { user_id: user.id, policy_type: "terms_of_service", version: TERMS_VERSION, method: "signup" },
      ]);
      if (policyError) throw policyError;
      router.replace("/dashboard");
    } catch (e: any) {
      AppAlert.alert("Couldn't save that", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#510000" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-foreground text-[34px] leading-tight mb-2" style={{ fontFamily: "Tanker" }}>
        Before you continue.
      </Text>
      <Text className="text-text-muted text-sm mb-8 leading-relaxed">
        Quick check — we need your agreement to these before your account is ready.
      </Text>

      <CheckboxRow
        checked={agreed}
        onToggle={setAgreed}
        label={
          <>
            I agree to the{" "}
            <Text style={{ color: "#510000", fontFamily: "Satoshi-Medium" }} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
              Privacy Policy
            </Text>{" "}
            and{" "}
            <Text style={{ color: "#510000", fontFamily: "Satoshi-Medium" }} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}>
              Terms of Use
            </Text>
            .
          </>
        }
      />

      <TouchableOpacity
        className="h-[44px] rounded-button items-center justify-center mt-6"
        style={{ backgroundColor: "#510000", opacity: saving || !agreed ? 0.6 : 1 }}
        onPress={accept}
        disabled={saving || !agreed}
      >
        <Text className="text-[#F8ECEE] font-semibold text-base">
          {saving ? "Saving…" : "Continue"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
