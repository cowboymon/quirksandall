// Screen 4 — Routine & medical
import { View, Text, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { Headline, Input, Textarea, PrimaryButton, SkipButton, ProgressDots, Eyebrow, Card } from "../../components/ui";
import { Underlined } from "../../components/Underlined";
import { useOnboardingStore } from "../../stores/onboarding";
import { supabase } from "../../lib/supabase";
import { uploadPetPhoto } from "../../lib/uploadPhoto";
import { colors } from "@quirksandall/shared";
import { useState } from "react";

// One feeding meal block: label + time + amount on the blush surface.
function MealBlock({
  label, time, amount, onTime, onAmount, divider,
}: {
  label: string; time: string; amount: string;
  onTime: (v: string) => void; onAmount: (v: string) => void; divider: boolean;
}) {
  return (
    <View style={{ paddingVertical: 10, borderTopWidth: divider ? 1 : 0, borderTopColor: colors.border }}>
      <Text style={{ color: colors.textDark, fontSize: 13, fontFamily: "Satoshi-Medium", marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Input filled style={{ flex: 1, minHeight: 40, paddingVertical: 9 }} placeholder="Time" value={time} onChangeText={onTime} />
        <Input filled style={{ flex: 1, minHeight: 40, paddingVertical: 9 }} placeholder="Amount" value={amount} onChangeText={onAmount} />
      </View>
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
          owner_id: user.id,
          name: pet.name,
          breed: pet.breed,
          species: pet.species ?? "dog",
          dob: pet.dob ?? new Date().toISOString().slice(0, 10),
          dob_is_estimated: pet.dobIsEstimated ?? false,
          sex: pet.sex,
          weight: pet.weight,
          color_markings: pet.colorMarkings,
          microchip_number: pet.microchipNumber,
          photo_url: null,
        })
        .select("id")
        .single();

      if (!newPet) throw new Error("Failed to create pet");

      if (pet.photoUri?.startsWith("file://")) {
        const photoUrl = await uploadPetPhoto(newPet.id, pet.photoUri);
        await supabase.from("pets").update({ photo_url: photoUrl }).eq("id", newPet.id);
      }

      await supabase.from("pet_vet_info").insert({
        pet_id: newPet.id,
        primary_vet: { clinic: pet.vetClinic, phone: pet.vetPhone },
        emergency_vet: { clinic: pet.emergVetClinic, phone: pet.emergVetPhone },
        insurance: { provider: pet.insuranceProvider, policy_number: pet.insurancePolicy },
      });

      if (pet.backupName) {
        await supabase.from("owners").update({
          backup_contacts: [{
            name: pet.backupName, relationship: pet.backupRelationship,
            phone: pet.backupPhone, consent_to_share: pet.backupConsent ?? false,
          }],
        }).eq("id", user.id);
      }

      await supabase.from("pet_behavior").insert({
        pet_id: newPet.id,
        commands: pet.commands ?? [],
        scared: pet.scared, no_go: pet.noGo, flight_risk: pet.flightRisk,
        escape_risk: { flag: !!pet.flightRisk, notes: pet.flightRisk },
        quirks_triggers: [],
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
          brand: pet.feedingBrand,
          breakfast: { time: pet.feedingBreakfastTime, amount: pet.feedingBreakfastAmount },
          lunch: { time: pet.feedingLunchTime, amount: pet.feedingLunchAmount },
          dinner: { time: pet.feedingDinnerTime, amount: pet.feedingDinnerAmount },
          treats: { type: pet.feedingTreatsType, limit: pet.feedingTreatsLimit },
          notes: pet.feedingNotes,
        },
        walks: pet.walks, sleep: pet.sleep, bathroom_habits: pet.bathroomHabits,
      });

      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      await supabase.from("share_links").insert({
        pet_id: newPet.id, token, label: "Main link", pin_hash: null, mode: "full", revoked: false,
      });

      reset();
      router.replace("/dashboard");
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <ProgressDots total={4} current={4} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginTop: 20, marginBottom: 4 }}>
        <Headline>A normal day </Headline>
        <Underlined><Headline>for {pet.name ?? "your pet"}.</Headline></Underlined>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 24, fontFamily: "Satoshi-Light" }}>
        Routine is saved now — sitters only see it once you unlock it.
      </Text>

      <View style={{ gap: 16 }}>
        {/* Feeding */}
        <View>
          <Eyebrow ochre>Feeding</Eyebrow>
          <Card style={{ marginTop: 8 }}>
            <Input placeholder="Food brand" value={pet.feedingBrand ?? ""} onChangeText={(v) => setPet({ feedingBrand: v })} />
            <MealBlock label="Breakfast" time={pet.feedingBreakfastTime ?? ""} amount={pet.feedingBreakfastAmount ?? ""} onTime={(v) => setPet({ feedingBreakfastTime: v })} onAmount={(v) => setPet({ feedingBreakfastAmount: v })} divider={false} />
            <MealBlock label="Lunch" time={pet.feedingLunchTime ?? ""} amount={pet.feedingLunchAmount ?? ""} onTime={(v) => setPet({ feedingLunchTime: v })} onAmount={(v) => setPet({ feedingLunchAmount: v })} divider />
            <MealBlock label="Dinner" time={pet.feedingDinnerTime ?? ""} amount={pet.feedingDinnerAmount ?? ""} onTime={(v) => setPet({ feedingDinnerTime: v })} onAmount={(v) => setPet({ feedingDinnerAmount: v })} divider />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Input style={{ flex: 1 }} placeholder="Treats (type)" value={pet.feedingTreatsType ?? ""} onChangeText={(v) => setPet({ feedingTreatsType: v })} />
              <Input style={{ flex: 1 }} placeholder="Limit" value={pet.feedingTreatsLimit ?? ""} onChangeText={(v) => setPet({ feedingTreatsLimit: v })} />
            </View>
            <Textarea style={{ marginTop: 8 }} placeholder="Notes (e.g. slow feeder bowl only)" value={pet.feedingNotes ?? ""} onChangeText={(v) => setPet({ feedingNotes: v })} />
          </Card>
        </View>

        {/* Routine */}
        <View>
          <Eyebrow ochre>Routine</Eyebrow>
          <View style={{ marginTop: 8, gap: 12 }}>
            <View>
              <Eyebrow>Walks</Eyebrow>
              <Textarea style={{ marginTop: 4 }} placeholder="45 min morning, 20 min evening…" value={pet.walks ?? ""} onChangeText={(v) => setPet({ walks: v })} />
            </View>
            <View>
              <Eyebrow>Sleep</Eyebrow>
              <Textarea style={{ marginTop: 4 }} placeholder="Dog bed in the bedroom, door stays open…" value={pet.sleep ?? ""} onChangeText={(v) => setPet({ sleep: v })} />
            </View>
          </View>
        </View>

        {/* Medical */}
        <View>
          <Eyebrow ochre>Medical</Eyebrow>
          <View style={{ marginTop: 8, gap: 12 }}>
            <View>
              <Eyebrow>Allergies</Eyebrow>
              <Textarea style={{ marginTop: 4 }} placeholder="Chicken-based kibble causes skin itching…" value={pet.allergies ?? ""} onChangeText={(v) => setPet({ allergies: v })} />
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4, fontFamily: "Satoshi-Light" }}>Always shown to sitters, even on free tier — safety override.</Text>
            </View>
            <View>
              <Eyebrow>Medications</Eyebrow>
              <Textarea style={{ marginTop: 4 }} placeholder="Name, dose, frequency, where it's stored" value={pet.medications ?? ""} onChangeText={(v) => setPet({ medications: v })} />
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4, fontFamily: "Satoshi-Light" }}>Paid tier: visible to sitters. Free tier: saved but not shown.</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <PrimaryButton label={saving ? "Saving…" : "Finish profile"} onPress={finish} disabled={saving} />
        <SkipButton label="Skip — link still works" onPress={() => router.replace("/dashboard")} />
      </View>
    </ScrollView>
  );
}
