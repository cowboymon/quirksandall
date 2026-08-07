// Onboarding Step 0 — owner's own details, before pet setup. Not part of the
// "N of 4" pet steps (no progress dots). Their name + mobile appear on the
// missing poster and in the PIN-gated contact block, so we collect them upfront.
//
// The marketing/insurance opt-ins (#98) live at the bottom of this same screen
// rather than their own step — one less screen in onboarding. They stay a
// clearly separate, unchecked-by-default toggle pair, never bundled into
// "Continue" the way the required Privacy/Terms agreement is on auth.tsx.
import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Switch, type TextInput } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { AppAlert } from "../../stores/appAlert";
import { Headline, Input, PrimaryButton, Eyebrow } from "../../components/ui";
import { colors, CONSENT_POLICY_VERSION } from "@quirksandall/shared";

export default function OwnerSetup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      const { data: owner } = await supabase
        .from("owners").select("name, primary_phone, primary_email").eq("id", user.id).single();
      setName(owner?.name ?? "");
      setPhone(owner?.primary_phone ?? "");
      setEmail(owner?.primary_email ?? user.email ?? "");
      setLoading(false);
    })();
  }, []);

  const canContinue = !!name.trim() && !!phone.trim();

  const next = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Surface a failed write instead of sailing on: these details feed the
        // missing poster and the PIN-gated contact block, and a silent failure
        // here left "Your details" empty with no clue why (#11, build-21 smoke
        // test). Stay on this screen so the user can retry.
        const { error } = await supabase
          .from("owners")
          .update({
            name: name.trim(),
            primary_phone: phone.trim(),
            consent_marketing: marketing,
            consent_insurance_offers: insurance,
            consent_updated_at: new Date().toISOString(),
            consent_policy_version: CONSENT_POLICY_VERSION,
          })
          .eq("id", user.id);
        if (error) {
          AppAlert.alert("Couldn't save your details", "Please try again.");
          return;
        }
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

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.textDark} /></View>;
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 40, width: "100%", maxWidth: 600, alignSelf: "center" }}
    >
      <Eyebrow>Welcome</Eyebrow>
      <Headline className="mt-1.5">First, a bit about you.</Headline>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24, fontFamily: "Satoshi-Light" }}>
        Your details appear on the missing poster and help sitters reach you directly.
      </Text>

      <View style={{ gap: 16 }}>
        <View>
          <Eyebrow>Your name *</Eyebrow>
          <Input name className="mt-1" placeholder="e.g. Jamie Nguyen" value={name} onChangeText={setName} autoFocus autoComplete="off" textContentType="none" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()} />
        </View>
        <View>
          <Eyebrow>Mobile number *</Eyebrow>
          <Input ref={phoneRef} className="mt-1" placeholder="e.g. 0412 345 678" phone keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        </View>
        <View>
          <Eyebrow>Email address</Eyebrow>
          <Input className="mt-1" style={{ opacity: 0.6 }} value={email} editable={false} />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6, fontFamily: "Satoshi-Light" }}>
            Email is used to recover your profile. Never shared with sitters.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 28, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Eyebrow>Staying in touch</Eyebrow>
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: "Satoshi-Light", marginTop: 4, marginBottom: 16 }}>
          Both optional, off by default — change either anytime in Account.
        </Text>

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

      <View style={{ marginTop: 28 }}>
        <PrimaryButton label={saving ? "Saving…" : "Continue"} onPress={next} disabled={!canContinue || saving} />
      </View>
    </ScrollView>
  );
}
