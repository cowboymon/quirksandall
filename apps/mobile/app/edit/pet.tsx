// Edit pet basics: photo, name, breed/species, DOB, sex, weight, microchip
import { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card } from "../../components/ui";
import { computeAge, colors } from "@quirksandall/shared";
import { uploadPetPhoto } from "../../lib/uploadPhoto";

export default function EditPet() {
  const { pet, petId, loading } = useActivePet();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [species, setSpecies] = useState("dog");
  const [dob, setDob] = useState("");
  const [dobIsEstimated, setDobIsEstimated] = useState(false);
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  const [colorMarkings, setColorMarkings] = useState("");
  const [microchip, setMicrochip] = useState("");
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
                borderColor: dobIsEstimated ? colors.primary : colors.border,
                backgroundColor: dobIsEstimated ? colors.primary : "#FFFFFF",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {dobIsEstimated && <Text style={{ color: "#F7E9C9", fontSize: 11, fontWeight: "700" }}>✓</Text>}
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
      </View>
    </EditShell>
  );
}
