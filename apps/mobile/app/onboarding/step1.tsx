// Screen 1 — Pet basics: photo, name, breed/species, DOB
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Platform } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Headline, Input, PrimaryButton, SkipButton, ProgressDots, Eyebrow } from "../../components/ui";
import { useOnboardingStore } from "../../stores/onboarding";
import { colors } from "@quirksandall/shared";

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

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <ProgressDots total={4} current={0} />

      <Headline className="mt-5 mb-2">
        {pet.name ? `${pet.name}'s got quirks.` : "Let's meet your pet."}
      </Headline>
      <Text className="text-text-muted text-sm leading-relaxed mb-8">
        Let's write them down before someone else has to guess.
      </Text>

      {/* Photo picker */}
      <TouchableOpacity onPress={pickPhoto} className="self-center mb-6">
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

      <View style={{ gap: 12 }}>
        <View>
          <Eyebrow>Name</Eyebrow>
          <Input
            className="mt-1"
            placeholder="Biscuit"
            value={pet.name ?? ""}
            onChangeText={(v) => setPet({ name: v })}
            autoFocus
          />
        </View>

        <View>
          <Eyebrow>Breed or species</Eyebrow>
          <Input
            className="mt-1"
            placeholder="Golden Retriever mix"
            value={pet.breed ?? ""}
            onChangeText={(v) => setPet({ breed: v })}
          />
        </View>

        <View>
          <Eyebrow>Date of birth</Eyebrow>
          <Input
            className="mt-1"
            placeholder="15 March 2021"
            value={pet.dob ?? ""}
            onChangeText={(v) => setPet({ dob: v })}
          />
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
            Don't know it exactly? Best guess is fine — age updates itself from here on.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 32, gap: 8 }}>
        <PrimaryButton
          label="Get my link →"
          onPress={() => router.push("/onboarding/step2")}
          disabled={!canContinue}
        />
        <SkipButton label="Skip — link still works without a name" onPress={() => router.push("/onboarding/step2")} />
      </View>
    </ScrollView>
  );
}
