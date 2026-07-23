// Screen 1 — Pet basics: photo, name, breed/species, sex, colour, microchip,
// weight, DOB (with live age). Mirrors the prototype's Screen1PetBasics.
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Headline, Input, Select, DateInput, WeightInput, PrimaryButton, ProgressDots, Eyebrow } from "../../components/ui";
import { RollingAnimal } from "../../components/Underlined";
import { useOnboardingStore } from "../../stores/onboarding";
import { colors, computeAge, displayDateToISO } from "@quirksandall/shared";

const SEX_OPTIONS = ["Male", "Male, desexed", "Female", "Female, desexed"];

export default function Step1() {
  const { pet, setPet } = useOnboardingStore();
  const [photoUri, setPhotoUri] = useState<string | null>(pet.photoUri ?? null);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to add a pet photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setPet({ photoUri: uri });
    }
  };

  const canContinue = !!pet.name?.trim();
  const dobISO = displayDateToISO(pet.dob);
  const ageLabel = dobISO ? computeAge(dobISO, pet.dobIsEstimated ?? false) : null;

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 48 }}>
      <ProgressDots total={4} current={1} />

      <View style={{ marginTop: 28, marginBottom: 6 }}><Eyebrow>Step 1 of 4</Eyebrow></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 8 }}>
        <Headline>Introduce your </Headline>
        <RollingAnimal />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 24, fontFamily: "Satoshi-Light" }}>
        A name is all you need to generate the link. Everything else fills in around it.
      </Text>

      {/* Photo picker */}
      <TouchableOpacity onPress={pickPhoto} style={{ alignSelf: "center", marginBottom: 24 }}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: colors.dashedBorder }}
          />
        ) : (
          <View
            style={{
              width: 128, height: 128, borderRadius: 64,
              backgroundColor: "#FFFFFF",
              borderWidth: 2, borderColor: colors.dashedBorder,
              borderStyle: "dashed",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", lineHeight: 16 }}>
              Add{"\n"}photo
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ gap: 16 }}>
        <View>
          <Eyebrow>Name *</Eyebrow>
          <Input className="mt-1" placeholder="e.g. Biscuit" value={pet.name ?? ""} onChangeText={(v) => setPet({ name: v })} autoFocus autoComplete="off" textContentType="none" />
        </View>

        <View>
          <Eyebrow>Breed / species</Eyebrow>
          <Input className="mt-1" placeholder="e.g. Golden Retriever mix" value={pet.breed ?? ""} onChangeText={(v) => setPet({ breed: v })} />
        </View>

        <View>
          <Eyebrow>Sex</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <Select value={pet.sex ?? ""} onValueChange={(v) => setPet({ sex: v })} options={SEX_OPTIONS} />
          </View>
        </View>

        <View>
          <Eyebrow>Colour & markings</Eyebrow>
          <Input className="mt-1" placeholder="e.g. Golden, white chest patch" value={pet.colorMarkings ?? ""} onChangeText={(v) => setPet({ colorMarkings: v })} />
        </View>

        <View>
          <Eyebrow>Microchip number</Eyebrow>
          <Input className="mt-1" placeholder="e.g. 985141002345678" keyboardType="numeric" value={pet.microchipNumber ?? ""} onChangeText={(v) => setPet({ microchipNumber: v })} />
        </View>

        <View>
          <Eyebrow>Weight</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <WeightInput value={pet.weight ?? ""} onChangeText={(v) => setPet({ weight: v })} />
          </View>
        </View>

        <View>
          <Eyebrow>Date of birth</Eyebrow>
          <View style={{ marginTop: 4 }}>
            <DateInput value={pet.dob ?? ""} onChangeText={(v) => setPet({ dob: v })} />
          </View>
          {ageLabel && (
            <Text style={{ fontSize: 12, fontFamily: "Satoshi-Bold", color: colors.primary, marginTop: 6 }}>
              {ageLabel}{pet.dobIsEstimated ? " (estimated)" : ""}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => setPet({ dobIsEstimated: !pet.dobIsEstimated })}
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10 }}
          >
            <View
              style={{
                width: 18, height: 18, borderRadius: 4, borderWidth: 2, marginTop: 1,
                borderColor: pet.dobIsEstimated ? colors.textDark : colors.dashedBorder,
                backgroundColor: pet.dobIsEstimated ? colors.textDark : "transparent",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {pet.dobIsEstimated && <Text style={{ color: "#F8ECEE", fontSize: 11 }}>✓</Text>}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17, flex: 1 }}>
              Don't know it exactly? Best guess is fine — age updates itself from here on.
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <PrimaryButton
          label={`Get ${pet.name?.trim() || "your pet"}'s link`}
          onPress={() => router.push("/onboarding/step2")}
          disabled={!canContinue}
        />
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center" }}>
          The link works immediately. Fill in the rest after.
        </Text>
      </View>
    </ScrollView>
  );
}
