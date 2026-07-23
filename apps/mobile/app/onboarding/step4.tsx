// Screen 4 — Routine & medical
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { Headline, Textarea, InlineNote, PrimaryButton, SkipButton, ProgressDots, Eyebrow } from "../../components/ui";
import { Underlined } from "../../components/Underlined";
import { useOnboardingStore } from "../../stores/onboarding";
import { useActivePetStore } from "../../stores/activePet";
import { supabase } from "../../lib/supabase";
import { uploadPetPhoto } from "../../lib/uploadPhoto";
import { colors, displayDateToISO } from "@quirksandall/shared";
import { useState } from "react";

const mealInput = {
  minHeight: 38,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background, // blush #F8ECEE
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 14,
  fontFamily: "Satoshi",
  color: colors.textDark,
} as const;

function MealBlock({ label, time, amount, onTime, onAmount, divider }: {
  label: string; time: string; amount: string;
  onTime: (v: string) => void; onAmount: (v: string) => void; divider: boolean;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 12, fontFamily: "Satoshi-Bold", color: colors.textDark }}>{label}</Text>
      <TextInput style={mealInput} placeholder="Time — e.g. 7:30am" placeholderTextColor={colors.dashedBorder} value={time} onChangeText={onTime} />
      <TextInput style={mealInput} placeholder="Amount & brand" placeholderTextColor={colors.dashedBorder} value={amount} onChangeText={onAmount} />
    </View>
  );
}

export default function Step4() {
  const { pet, setPet, reset } = useOnboardingStore();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      await supabase.from("owners").upsert({ id: user.id, primary_email: user.email }).select("id").single();

      const { data: newPet } = await supabase
        .from("pets")
        .insert({
          owner_id: user.id, name: pet.name, breed: pet.breed, species: pet.species ?? "dog",
          dob: displayDateToISO(pet.dob) ?? new Date().toISOString().slice(0, 10), dob_is_estimated: pet.dobIsEstimated ?? false,
          sex: pet.sex, weight: pet.weight, color_markings: pet.colorMarkings, microchip_number: pet.microchipNumber, photo_url: null,
        })
        .select("id").single();
      if (!newPet) throw new Error("Failed to create pet");

      if (pet.photoUri?.startsWith("file://")) {
        const photoUrl = await uploadPetPhoto(newPet.id, pet.photoUri);
        await supabase.from("pets").update({ photo_url: photoUrl }).eq("id", newPet.id);
      }

      await supabase.from("pet_vet_info").insert({
        pet_id: newPet.id,
        primary_vet: { contact_name: pet.vetContactName, clinic: pet.vetClinic, phone: pet.vetPhone },
        emergency_vet: { clinic: pet.emergVetClinic, phone: pet.emergVetPhone },
        insurance: { provider: pet.insuranceProvider, policy_number: pet.insurancePolicy },
        vet_pre_auth: pet.vetPreAuth ?? false,
      });

      const backups = [];
      if (pet.backupName) backups.push({ name: pet.backupName, relationship: pet.backupRelationship, phone: pet.backupPhone, consent_to_share: pet.backupConsent ?? false });
      if (pet.backup2Name) backups.push({ name: pet.backup2Name, relationship: pet.backup2Relationship ?? "", phone: pet.backup2Phone, consent_to_share: pet.backup2Consent ?? false });
      if (backups.length) await supabase.from("owners").update({ backup_contacts: backups }).eq("id", user.id);

      await supabase.from("pet_behavior").insert({
        pet_id: newPet.id, commands: pet.commands ?? [], scared: pet.scared, no_go: pet.noGo, flight_risk: pet.flightRisk,
        escape_risk: { flag: !!pet.flightRisk, notes: pet.flightRisk }, quirks_triggers: [],
      });

      await supabase.from("pet_medical").insert({
        pet_id: newPet.id,
        allergies: pet.allergies ? [pet.allergies] : [],
        conditions: pet.conditions ? [pet.conditions] : [],
        medications: pet.medications ? [{ name: pet.medications, dose: "", frequency: "", time_of_day: "", location_stored: "", notes: "" }] : [],
      });

      await supabase.from("pet_routine").insert({
        pet_id: newPet.id,
        feeding: {
          breakfast: { time: pet.feedingBreakfastTime, amount: pet.feedingBreakfastAmount },
          lunch: { time: pet.feedingLunchTime, amount: pet.feedingLunchAmount },
          dinner: { time: pet.feedingDinnerTime, amount: pet.feedingDinnerAmount },
          treats: { type: pet.feedingTreatsType, limit: pet.feedingTreatsLimit },
          notes: pet.feedingNotes,
        },
        walks: pet.walks, sleep: pet.sleep, bathroom_habits: pet.bathroomHabits,
      });

      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const { data: newLink } = await supabase
        .from("share_links")
        .insert({ pet_id: newPet.id, token, label: "Main link", pin_hash: null, mode: "full", revoked: false })
        .select("id")
        .single();

      // Persist the PIN the owner chose during onboarding. Hashing happens
      // server-side in the set-pin edge function so we never store it plaintext.
      if (newLink?.id && pet.pin && /^\d{4}$/.test(pet.pin)) {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/set-pin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ link_id: newLink.id, pin: pet.pin }),
        }).catch(() => {});
      }

      // Make the pet we just created the active one, so the dashboard lands on
      // it instead of an earlier/stale selection (or bouncing to onboarding).
      useActivePetStore.getState().setPetId(newPet.id);
      reset();
      router.replace("/dashboard");
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>‹ Back</Text>
      </TouchableOpacity>
      <ProgressDots total={4} current={4} />

      <View style={{ marginTop: 20, marginBottom: 6 }}><Eyebrow>Step 4 of 4</Eyebrow></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" }}>
        <Headline>A normal day </Headline>
        <Underlined><Headline>for {pet.name ?? "them"}.</Headline></Underlined>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, fontFamily: "Satoshi-Light" }}>
        Your link already works. This is the full picture.
      </Text>
      <View style={{ marginTop: 12 }}>
        <InlineNote variant="paywall" cta="Unlock for $7.99" onCta={() => router.push("/upgrade")}>
          Routine's saved. Sitters won't see it until you unlock.
        </InlineNote>
      </View>

      {/* Routine */}
      <View style={{ marginTop: 24 }}>
        <Eyebrow ochre>Routine</Eyebrow>
        <View style={{ marginTop: 12, gap: 12 }}>
          {/* Feeding card */}
          <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Eyebrow ochre>Feeding</Eyebrow>
            </View>
            <MealBlock label="Breakfast" time={pet.feedingBreakfastTime ?? ""} amount={pet.feedingBreakfastAmount ?? ""} onTime={(v) => setPet({ feedingBreakfastTime: v })} onAmount={(v) => setPet({ feedingBreakfastAmount: v })} divider />
            <MealBlock label="Lunch" time={pet.feedingLunchTime ?? ""} amount={pet.feedingLunchAmount ?? ""} onTime={(v) => setPet({ feedingLunchTime: v })} onAmount={(v) => setPet({ feedingLunchAmount: v })} divider />
            <MealBlock label="Dinner" time={pet.feedingDinnerTime ?? ""} amount={pet.feedingDinnerAmount ?? ""} onTime={(v) => setPet({ feedingDinnerTime: v })} onAmount={(v) => setPet({ feedingDinnerAmount: v })} divider />
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 12, fontFamily: "Satoshi-Bold", color: colors.textDark }}>Treats</Text>
              <TextInput style={mealInput} placeholder="Type / brand" placeholderTextColor={colors.dashedBorder} value={pet.feedingTreatsType ?? ""} onChangeText={(v) => setPet({ feedingTreatsType: v })} />
              <TextInput style={mealInput} placeholder="Daily limit — e.g. max 3 per day" placeholderTextColor={colors.dashedBorder} value={pet.feedingTreatsLimit ?? ""} onChangeText={(v) => setPet({ feedingTreatsLimit: v })} />
            </View>
            <TextInput
              style={{ paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, fontFamily: "Satoshi", color: colors.textMuted }}
              placeholder="Notes — slow feeder, timing, anything else…"
              placeholderTextColor={colors.dashedBorder}
              value={pet.feedingNotes ?? ""}
              onChangeText={(v) => setPet({ feedingNotes: v })}
            />
          </View>

          <View>
            <Eyebrow>Walks</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="Frequency, duration, any notes…" value={pet.walks ?? ""} onChangeText={(v) => setPet({ walks: v })} />
          </View>
          <View>
            <Eyebrow>Sleep setup</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="Crate, bed location, door open/closed…" value={pet.sleep ?? ""} onChangeText={(v) => setPet({ sleep: v })} />
          </View>
        </View>
      </View>

      {/* Medical */}
      <View style={{ marginTop: 24 }}>
        <Eyebrow ochre>Medical</Eyebrow>
        <View style={{ marginTop: 12, gap: 12 }}>
          <View>
            <Eyebrow>Allergies</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="Food, environmental, medication…" value={pet.allergies ?? ""} onChangeText={(v) => setPet({ allergies: v })} />
          </View>
          <View>
            <Eyebrow>Medications</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="Name, dose, timing, location stored…" value={pet.medications ?? ""} onChangeText={(v) => setPet({ medications: v })} />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <PrimaryButton label={saving ? "Saving…" : "Finish profile"} onPress={finish} disabled={saving} />
        <SkipButton label={`${pet.name ?? "Their"}'s link already works — skip for now`} onPress={() => router.replace("/dashboard")} />
      </View>
    </ScrollView>
  );
}
