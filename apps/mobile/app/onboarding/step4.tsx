// Screen 4 — Routine & medical
import { View, Text, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { Headline, Input, PrimaryButton, SkipButton, ProgressDots, Eyebrow, Card } from "../../components/ui";
import { useOnboardingStore } from "../../stores/onboarding";
import { supabase } from "../../lib/supabase";
import { uploadPetPhoto } from "../../lib/uploadPhoto";
import { colors } from "@quirksandall/shared";
import { useState } from "react";

export default function Step4() {
  const { pet, setPet, reset } = useOnboardingStore();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Upsert owner
      const { data: owner } = await supabase
        .from("owners")
        .upsert({ id: user.id, primary_email: user.email })
        .select("id, purchase_status")
        .single();

      // Insert pet
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
          photo_url: null, // uploaded below after we have the pet id
        })
        .select("id")
        .single();

      if (!newPet) throw new Error("Failed to create pet");

      // Upload photo now that we have a petId
      if (pet.photoUri?.startsWith("file://")) {
        const photoUrl = await uploadPetPhoto(newPet.id, pet.photoUri);
        await supabase.from("pets").update({ photo_url: photoUrl }).eq("id", newPet.id);
      }

      // Vet info
      await supabase.from("pet_vet_info").insert({
        pet_id: newPet.id,
        primary_vet: { clinic: pet.vetClinic, phone: pet.vetPhone },
        emergency_vet: { clinic: pet.emergVetClinic, phone: pet.emergVetPhone },
        insurance: { provider: pet.insuranceProvider, policy_number: pet.insurancePolicy },
      });

      // Update owner backup contacts
      if (pet.backupName) {
        await supabase.from("owners").update({
          backup_contacts: [{
            name: pet.backupName,
            relationship: pet.backupRelationship,
            phone: pet.backupPhone,
            consent_to_share: pet.backupConsent ?? false,
          }],
        }).eq("id", user.id);
      }

      // Behavior
      await supabase.from("pet_behavior").insert({
        pet_id: newPet.id,
        commands: pet.commands ?? [],
        scared: pet.scared,
        no_go: pet.noGo,
        flight_risk: pet.flightRisk,
        escape_risk: { flag: !!pet.flightRisk, notes: pet.flightRisk },
        quirks_triggers: [],
      });

      // Medical
      await supabase.from("pet_medical").insert({
        pet_id: newPet.id,
        allergies: pet.allergies ? [pet.allergies] : [],
        conditions: pet.conditions ? [pet.conditions] : [],
        medications: pet.medications ? [{ name: pet.medications, dose: "", frequency: "", time_of_day: "", location_stored: "", notes: "" }] : [],
      });

      // Routine
      await supabase.from("pet_routine").insert({
        pet_id: newPet.id,
        feeding: {
          brand: pet.feedingBrand,
          breakfast: { time: pet.feedingBreakfastTime, amount: pet.feedingBreakfastAmount },
          dinner: { time: pet.feedingDinnerTime, amount: pet.feedingDinnerAmount },
          treats: { type: pet.feedingTreatsType, limit: pet.feedingTreatsLimit },
          notes: pet.feedingNotes,
        },
        walks: pet.walks,
        sleep: pet.sleep,
        bathroom_habits: pet.bathroomHabits,
      });

      // Share link
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      // PIN hashing is done server-side via the set-pin edge function or RPC.
      // For now, store PIN plaintext temporarily; production replaces with RPC call.
      await supabase.from("share_links").insert({
        pet_id: newPet.id,
        token,
        pin_hash: null, // Set via /api/set-pin after creation
        mode: "full",
        revoked: false,
      });

      reset();
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <ProgressDots total={4} current={3} />

      <Headline className="mt-5 mb-1">
        A normal day for {pet.name ?? "your pet"}.
      </Headline>
      <Text className="text-text-muted text-sm leading-relaxed mb-6">
        Routine is saved now — sitters only see it once you unlock it.
      </Text>

      <View style={{ gap: 12 }}>
        <Card>
          <Eyebrow>Feeding</Eyebrow>
          <Input className="mt-2" placeholder="Food brand" value={pet.feedingBrand ?? ""} onChangeText={(v) => setPet({ feedingBrand: v })} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Input style={{ flex: 1 }} placeholder="Breakfast time" value={pet.feedingBreakfastTime ?? ""} onChangeText={(v) => setPet({ feedingBreakfastTime: v })} />
            <Input style={{ flex: 1 }} placeholder="Amount" value={pet.feedingBreakfastAmount ?? ""} onChangeText={(v) => setPet({ feedingBreakfastAmount: v })} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Input style={{ flex: 1 }} placeholder="Dinner time" value={pet.feedingDinnerTime ?? ""} onChangeText={(v) => setPet({ feedingDinnerTime: v })} />
            <Input style={{ flex: 1 }} placeholder="Amount" value={pet.feedingDinnerAmount ?? ""} onChangeText={(v) => setPet({ feedingDinnerAmount: v })} />
          </View>
          <Input className="mt-2" placeholder="Treats (type)" value={pet.feedingTreatsType ?? ""} onChangeText={(v) => setPet({ feedingTreatsType: v })} />
          <Input className="mt-2" placeholder="Treat limit" value={pet.feedingTreatsLimit ?? ""} onChangeText={(v) => setPet({ feedingTreatsLimit: v })} />
          <Input className="mt-2" placeholder="Notes (e.g. slow feeder bowl only)" value={pet.feedingNotes ?? ""} onChangeText={(v) => setPet({ feedingNotes: v })} />
        </Card>

        <Card>
          <Eyebrow>Walks</Eyebrow>
          <Input className="mt-2" placeholder="45 min morning, 20 min evening…" value={pet.walks ?? ""} onChangeText={(v) => setPet({ walks: v })} />
        </Card>

        <Card>
          <Eyebrow>Sleep</Eyebrow>
          <Input className="mt-2" placeholder="Dog bed in the bedroom, door stays open…" value={pet.sleep ?? ""} onChangeText={(v) => setPet({ sleep: v })} />
        </Card>

        <Card>
          <Eyebrow>Allergies</Eyebrow>
          <Input className="mt-2" placeholder="Chicken-based kibble causes skin itching…" value={pet.allergies ?? ""} onChangeText={(v) => setPet({ allergies: v })} />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Always shown to sitters, even on free tier — safety override.</Text>
        </Card>

        <Card>
          <Eyebrow>Medications</Eyebrow>
          <Input className="mt-2" placeholder="Name, dose, frequency, where it's stored" value={pet.medications ?? ""} onChangeText={(v) => setPet({ medications: v })} />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Paid tier: visible to sitters. Free tier: saved but not shown.</Text>
        </Card>
      </View>

      <View style={{ marginTop: 32, gap: 8 }}>
        <PrimaryButton label={saving ? "Saving…" : "Finish profile"} onPress={finish} disabled={saving} />
        <SkipButton label="Skip — link still works" onPress={() => router.replace("/(tabs)/dashboard")} />
      </View>
    </ScrollView>
  );
}
