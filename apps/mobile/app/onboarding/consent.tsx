// Onboarding Step 0.5 — marketing / insurance-offer opt-ins. Shown once, right
// after the owner enters their details and before pet setup, so both consent
// types are handled up front — but unlike the Privacy/Terms agreement on the
// sign-in screen, nothing here is required. Both toggles default off and
// "Continue" is never gated by them (opt-in, not a condition of using the app).
import { useState } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Headline, PrimaryButton, Eyebrow } from "../../components/ui";
import { colors, CONSENT_POLICY_VERSION } from "@quirksandall/shared";

export default function OnboardingConsent() {
  const [marketing, setMarketing] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [saving, setSaving] = useState(false);

  const next = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("owners")
          .update({
            consent_marketing: marketing,
            consent_insurance_offers: insurance,
            consent_updated_at: new Date().toISOString(),
            consent_policy_version: CONSENT_POLICY_VERSION,
          })
          .eq("id", user.id);
        await supabase.from("consent_log").insert([
          { owner_id: user.id, consent_type: "marketing", granted: marketing, policy_version: CONSENT_POLICY_VERSION },
          { owner_id: user.id, consent_type: "insurance_offers", granted: insurance, policy_version: CONSENT_POLICY_VERSION },
        ]);
      }
      router.push("/onboarding/step1");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 40, width: "100%", maxWidth: 600, alignSelf: "center" }}
    >
      <Eyebrow>Staying in touch</Eyebrow>
      <Headline className="mt-1.5">How we can reach you.</Headline>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 28, fontFamily: "Satoshi-Light" }}>
        Both are optional and off by default — you can change either anytime in Account.
      </Text>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 15, fontFamily: "Satoshi-Medium" }}>Product news &amp; tips</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: "Satoshi-Light", marginTop: 3 }}>
              Occasional emails about new features and getting the most out of Quirks &amp; All.
            </Text>
          </View>
          <Switch
            value={marketing}
            onValueChange={setMarketing}
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
              Occasional offers from pet insurance partners, matched to your pet's details.
            </Text>
          </View>
          <Switch
            value={insurance}
            onValueChange={setInsurance}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
            style={{ marginTop: 2 }}
          />
        </View>
      </View>

      <View style={{ marginTop: 32 }}>
        <PrimaryButton label={saving ? "Saving…" : "Continue"} onPress={next} disabled={saving} />
      </View>
    </ScrollView>
  );
}
