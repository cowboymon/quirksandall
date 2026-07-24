// Edit pet basics: photo, name, breed/species, DOB, sex, weight, microchip
import { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert, Modal, Share } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import { useActivePetStore } from "../../stores/activePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card, Select, DateInput, WeightInput } from "../../components/ui";
import { computeAge, colors, isoToDisplayDate, displayDateToISO, capitalizeFirst } from "@quirksandall/shared";

const SPECIES_OPTIONS = ["Dog", "Cat", "Bird", "Rabbit", "Other"];
import { uploadPetPhoto } from "../../lib/uploadPhoto";

export default function EditPet() {
  const { pet, petId, loading } = useActivePet();
  const setPetId = useActivePetStore((s) => s.setPetId);

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [species, setSpecies] = useState("");
  const [dob, setDob] = useState("");
  const [dobIsEstimated, setDobIsEstimated] = useState(false);
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  const [colorMarkings, setColorMarkings] = useState("");
  const [microchip, setMicrochip] = useState("");
  const [descriptionForId, setDescriptionForId] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!pet) return;
    setName(pet.name ?? "");
    setBreed(pet.breed ?? "");
    // Show what was actually stored (capitalised to match the Select options),
    // never a guessed default — species is an explicit choice, not derived.
    setSpecies(pet.species ? capitalizeFirst(pet.species) : "");
    setDob(isoToDisplayDate(pet.dob));
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
          // NOT NULL column — fall back to the stored value if left unset,
          // rather than silently forcing a species the owner didn't pick.
          species: species || pet?.species || "dog",
          // dob is NOT NULL — keep the stored value if the field is cleared/invalid
          dob: displayDateToISO(dob) ?? pet?.dob,
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

  // Pull everything we hold on this pet into a single JSON payload the owner
  // can keep (Files, Notes, email…) before deleting.
  const exportPetData = async () => {
    if (!petId) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
      const [petRow, behavior, routine, medical, vet, owner] = await Promise.all([
        supabase.from("pets").select("*").eq("id", petId).single(),
        supabase.from("pet_behavior").select("*").eq("pet_id", petId).maybeSingle(),
        supabase.from("pet_routine").select("*").eq("pet_id", petId).maybeSingle(),
        supabase.from("pet_medical").select("*").eq("pet_id", petId).maybeSingle(),
        supabase.from("pet_vet_info").select("*").eq("pet_id", petId).maybeSingle(),
        supabase.from("owners").select("name, primary_phone, primary_email, backup_contacts").eq("id", user!.id).single(),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        app: "Quirks & All",
        pet: petRow.data,
        behavior: behavior.data,
        routine: routine.data,
        medical: medical.data,
        vet_info: vet.data,
        owner: owner.data,
      };

      await Share.share({
        title: `${name || "Pet"} — Quirks & All export`,
        message: JSON.stringify(payload, null, 2),
      });
    } catch (e: any) {
      Alert.alert("Couldn't export", e.message);
    } finally {
      setExporting(false);
    }
  };

  const doDelete = async () => {
    if (!petId) return;
    // Soft-archive: keeps history, and the dashboard only shows active pets.
    // Revoke the pet's links so they stop resolving immediately. Surface any
    // failure rather than leaving the pet/links live (#57/#65).
    const { error: petErr } = await supabase.from("pets").update({ status: "archived" }).eq("id", petId);
    const { error: linkErr } = await supabase.from("share_links").update({ revoked: true }).eq("pet_id", petId);
    if (petErr || linkErr) {
      Alert.alert("Couldn't delete", (petErr ?? linkErr)!.message);
      return;
    }
    // Route to the next active pet, or onboarding if none remain. Exclude the
    // just-archived pet explicitly to avoid any read-after-write race.
    const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
    const { data: next } = await supabase
      .from("pets").select("id").eq("owner_id", user!.id).eq("status", "active").neq("id", petId).limit(1).maybeSingle();
    setShowDelete(false);
    if (next?.id) setPetId(next.id);
    router.replace(next?.id ? "/dashboard" : "/onboarding/step1");
  };

  const dobISO = displayDateToISO(dob);
  const age = dobISO ? computeAge(dobISO, dobIsEstimated) : null;

  return (
    <EditShell title="Pet Basics" onSave={save} saving={saving} loading={loading} saveLabel="Save">
      {/* Photo — with a delete affordance overlaid on the corner */}
      <View style={{ alignSelf: "center", marginBottom: 24, width: 96, height: 96 }}>
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>
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
              <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center" }}>Add{"\n"}photo</Text>
            </View>
          )}
        </TouchableOpacity>
        {/* Delete pet — overlaid on the profile photo */}
        <TouchableOpacity
          onPress={() => setShowDelete(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: "absolute", top: -4, right: -4,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
            borderWidth: 2, borderColor: "#F8ECEE",
          }}
        >
          <Ionicons name="trash-outline" size={14} color="#F8ECEE" />
        </TouchableOpacity>
        <Text style={{ color: colors.accent, fontSize: 12, textAlign: "center", marginTop: 6 }}>
          {photoUri ? "Change photo" : "Add photo"}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Card>
          <Eyebrow>Name</Eyebrow>
          <Input className="mt-1" placeholder="Biscuit" value={name} onChangeText={setName} />
        </Card>

        <Card>
          <Eyebrow>Species</Eyebrow>
          <View style={{ marginTop: 4, gap: 8 }}>
            {(() => {
              const isOther = species === "Other" || (!!species && !["Dog", "Cat", "Bird", "Rabbit"].includes(species));
              return (
                <>
                  <Select value={isOther ? "Other" : species} onValueChange={setSpecies} options={SPECIES_OPTIONS} placeholder="Select species" />
                  {isOther && (
                    <Input placeholder="Which species?" value={species === "Other" ? "" : species} onChangeText={(v) => setSpecies(v || "Other")} />
                  )}
                </>
              );
            })()}
          </View>
        </Card>

        <Card>
          <Eyebrow>Breed</Eyebrow>
          <Input className="mt-1" placeholder="Golden Retriever mix" value={breed} onChangeText={setBreed} />
        </Card>

        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Eyebrow>Date of birth</Eyebrow>
            {age && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{age}</Text>}
          </View>
          <View style={{ marginTop: 4 }}>
            <DateInput value={dob} onChangeText={setDob} />
          </View>
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
              {dobIsEstimated && <Text style={{ color: "#F8ECEE", fontSize: 11, fontFamily: "Satoshi-Bold" }}>✓</Text>}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              Don't know exactly — best guess
            </Text>
          </TouchableOpacity>
        </Card>

        <Card>
          <Eyebrow>Sex</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <Select value={sex} onValueChange={setSex} options={["Male", "Male, desexed", "Female", "Female, desexed"]} />
          </View>
        </Card>

        <Card>
          <Eyebrow>Weight</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <WeightInput value={weight} onChangeText={setWeight} />
          </View>
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

      {/* Delete confirmation — bottom sheet, matching the prototype */}
      <Modal visible={showDelete} transparent animationType="fade" onRequestClose={() => setShowDelete(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowDelete(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end", padding: 16 }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, gap: 16 }}>
            <View>
              <Text style={{ fontFamily: "Tanker", fontSize: 26, lineHeight: 30, color: colors.textDark }}>
                Say goodbye to {name || "this pet"}'s profile?
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8, lineHeight: 20, fontFamily: "Satoshi-Light" }}>
                Everything you've written stays gone once it's gone. If you'd rather keep the memories, you can export first.
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={exportPetData}
                disabled={exporting}
                style={{ height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: exporting ? 0.5 : 1 }}
              >
                <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>
                  {exporting ? "Preparing export…" : "Export first"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={doDelete}
                style={{ height: 46, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#F8ECEE", fontSize: 14, fontFamily: "Satoshi-Medium" }}>Delete anyway</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDelete(false)} style={{ alignItems: "center", paddingVertical: 6 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi" }}>Never mind</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </EditShell>
  );
}
