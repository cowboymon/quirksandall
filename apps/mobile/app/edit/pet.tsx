// Edit pet basics: photo, name, breed/species, DOB, sex, weight, microchip
import { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import { useActivePetStore } from "../../stores/activePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card } from "../../components/ui";
import { computeAge, colors } from "@quirksandall/shared";
import { uploadPetPhoto } from "../../lib/uploadPhoto";

export default function EditPet() {
  const { pet, petId, loading } = useActivePet();
  const setPetId = useActivePetStore((s) => s.setPetId);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [species, setSpecies] = useState("dog");
  const [dob, setDob] = useState("");
  const [dobIsEstimated, setDobIsEstimated] = useState(false);
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  const [colorMarkings, setColorMarkings] = useState("");
  const [microchip, setMicrochip] = useState("");
  const [descriptionForId, setDescriptionForId] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pet) return;
    setName(pet.name ?? "");
    setBreed(pet.breed ?? "");
    setSpecies(pet.species ?? "dog");
    setDob(pet.dob ?? "");
    setDobIsEstimated(pet.dob_is_estimated ?? false);
    setSex(pet.sex ?? "");
    setWeight(pet.weight ?? "");
    setColorMarkings(pet.color_markings ?? "");
    setMicrochip(pet.microchip_number ?? "");
    setDescriptionForId(pet.description_for_id ?? "");
    setPhotoUri(pet.photo_url ?? null);
  }, [pet]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to change the pet photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!petId) return;
    setSaving(true);
    try {
      // Upload new photo if user picked a local file
      let finalPhotoUrl = pet?.photo_url ?? null;
      if (photoUri && photoUri.startsWith("file://")) {
        finalPhotoUrl = await uploadPetPhoto(petId, photoUri);
      }

      const { error } = await supabase
        .from("pets")
        .update({
          name,
          breed: breed || null,
          species,
          dob,
          dob_is_estimated: dobIsEstimated,
          sex: sex || null,
          weight: weight || null,
          color_markings: colorMarkings || null,
          microchip_number: microchip || null,
          description_for_id: descriptionForId || null,
          photo_url: finalPhotoUrl,
        })
        .eq("id", petId);
      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePet = () => {
    if (!petId) return;
    Alert.alert(
      `Delete ${name || "this"}'s profile?`,
      "This removes the profile and immediately breaks every share link for it. This can't be undone.",
      [
        { text: "Never mind", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Soft-archive: keeps history, and the dashboard only shows active pets.
            await supabase.from("pets").update({ status: "archived" }).eq("id", petId);
            await supabase.from("share_links").update({ revoked: true }).eq("pet_id", petId);
            // Route to the next active pet, or onboarding if none remain.
            const { data: { user } } = await supabase.auth.getUser();
            const { data: next } = await supabase
              .from("pets").select("id").eq("owner_id", user!.id).eq("status", "active").limit(1).maybeSingle();
            if (next?.id) setPetId(next.id);
            router.replace(next ? "/dashboard" : "/onboarding/step1");
          },
        },
      ]
    );
  };

  const age = dob ? computeAge(dob, dobIsEstimated) : null;

  return (
    <EditShell title="Pet basics" onSave={save} saving={saving} loading={loading}>
      {/* Photo */}
      <TouchableOpacity onPress={pickPhoto} style={{ alignSelf: "center", marginBottom: 24 }}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: colors.border }}
          />
        ) : (
          <View
            style={{
              width: 96, height: 96, borderRadius: 48,
              backgroundColor: "#FFFFFF",
              borderWidth: 2, borderColor: colors.dashedBorder, borderStyle: "dashed",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center" }}>Change{"\n"}photo</Text>
          </View>
        )}
        <Text style={{ color: colors.accent, fontSize: 12, textAlign: "center", marginTop: 6 }}>
          {photoUri ? "Change photo" : "Add photo"}
        </Text>
      </TouchableOpacity>

      <View style={{ gap: 12 }}>
        <Card>
          <Eyebrow>Name</Eyebrow>
          <Input className="mt-1" placeholder="Biscuit" value={name} onChangeText={setName} />
        </Card>

        <Card>
          <Eyebrow>Breed / species</Eyebrow>
          <Input className="mt-1" placeholder="Golden Retriever mix" value={breed} onChangeText={setBreed} />
          <Input className="mt-2" placeholder="Species (dog, cat…)" value={species} onChangeText={setSpecies} />
        </Card>

        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Eyebrow>Date of birth</Eyebrow>
            {age && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{age}</Text>}
          </View>
          <Input
            className="mt-1"
            placeholder="2021-03-15"
            value={dob}
            onChangeText={setDob}
            keyboardType="numbers-and-punctuation"
          />
          <TouchableOpacity
            onPress={() => setDobIsEstimated(!dobIsEstimated)}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}
          >
            <View
              style={{
                width: 18, height: 18, borderRadius: 3, borderWidth: 1.5,
                borderColor: dobIsEstimated ? colors.button : colors.border,
                backgroundColor: dobIsEstimated ? colors.button : colors.cardBg,
                alignItems: "center", justifyContent: "center",
              }}
            >
              {dobIsEstimated && <Text style={{ color: "#F8ECEE", fontSize: 11, fontWeight: "700" }}>✓</Text>}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              Don't know exactly — best guess
            </Text>
          </TouchableOpacity>
        </Card>

        <Card>
          <Eyebrow>Sex</Eyebrow>
          <Input className="mt-1" placeholder="Female, spayed" value={sex} onChangeText={setSex} />
        </Card>

        <Card>
          <Eyebrow>Weight</Eyebrow>
          <Input className="mt-1" placeholder="28 kg" value={weight} onChangeText={setWeight} />
        </Card>

        <Card>
          <Eyebrow>Color / markings</Eyebrow>
          <Input className="mt-1" placeholder="Golden, white chest patch" value={colorMarkings} onChangeText={setColorMarkings} />
        </Card>

        <Card>
          <Eyebrow>Microchip number</Eyebrow>
          <Input className="mt-1" placeholder="985141002345678" value={microchip} onChangeText={setMicrochip} keyboardType="numeric" />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
            Always shown to recipients — safety override.
          </Text>
        </Card>

        <Card>
          <Eyebrow>What to look for</Eyebrow>
          <Input
            className="mt-1"
            placeholder="Walks with a limp, answers to 'Biscuit', shy with strangers"
            value={descriptionForId}
            onChangeText={setDescriptionForId}
            multiline
            style={{ height: 80, paddingTop: 12, textAlignVertical: "top" }}
          />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
            Missing poster only — never shown on the shared profile.
          </Text>
        </Card>

        {/* Danger zone */}
        <TouchableOpacity
          onPress={deletePet}
          style={{ marginTop: 20, height: 46, borderRadius: 10, borderWidth: 1, borderColor: "rgba(184,112,112,0.5)", alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: colors.danger, fontSize: 14, fontFamily: "Satoshi-Medium" }}>
            Delete {name || "this"}'s profile
          </Text>
        </TouchableOpacity>
      </View>
    </EditShell>
  );
}
