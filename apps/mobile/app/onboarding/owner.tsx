// Onboarding Step 0 — owner's own details, before pet setup. Not part of the
// "N of 4" pet steps (no progress dots). Their name + mobile appear on the
// missing poster and in the PIN-gated contact block, so we collect them upfront.
import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Headline, Input, PrimaryButton, Eyebrow } from "../../components/ui";
import { colors } from "@quirksandall/shared";

export default function OwnerSetup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        await supabase.from("owners").update({ name: name.trim(), primary_phone: phone.trim() }).eq("id", user.id);
      }
      router.replace("/onboarding/step1");
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
      contentContainerStyle={{ padding: 24, paddingTop: 72, paddingBottom: 40 }}
    >
      <Eyebrow>Welcome</Eyebrow>
      <Headline className="mt-1.5">First, a bit about you.</Headline>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24, fontFamily: "Satoshi-Light" }}>
        Your details appear on the missing poster and help sitters reach you directly.
      </Text>

      <View style={{ gap: 16 }}>
        <View>
          <Eyebrow>Your name *</Eyebrow>
          <Input name className="mt-1" placeholder="e.g. Jamie Nguyen" value={name} onChangeText={setName} autoFocus autoComplete="off" textContentType="none" />
        </View>
        <View>
          <Eyebrow>Mobile number *</Eyebrow>
          <Input className="mt-1" placeholder="e.g. 0412 345 678" phone keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        </View>
        <View>
          <Eyebrow>Email address</Eyebrow>
          <Input className="mt-1" style={{ opacity: 0.6 }} value={email} editable={false} />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6, fontFamily: "Satoshi-Light" }}>
            Email is used to recover your profile. Never shared with sitters.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 28 }}>
        <PrimaryButton label={saving ? "Saving…" : "Continue"} onPress={next} disabled={!canContinue || saving} />
      </View>
    </ScrollView>
  );
}
