// Screen 2 — Emergency essentials
import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import { Headline, Input, PrimaryButton, SkipButton, ProgressDots, Eyebrow, Card } from "../../components/ui";
import { useOnboardingStore } from "../../stores/onboarding";
import CheckboxRow from "../../components/CheckboxRow";

export default function Step2() {
  const { pet, setPet } = useOnboardingStore();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <ProgressDots total={4} current={1} />

      <Headline className="mt-5 mb-1">What a sitter needs most.</Headline>
      <Text className="text-text-muted text-sm leading-relaxed mb-6">
        PIN-gated — only people with the PIN see this block.
      </Text>

      <View style={{ gap: 12 }}>
        <Card>
          <Eyebrow>Vet</Eyebrow>
          <Input className="mt-2" placeholder="Clinic name" value={pet.vetClinic ?? ""} onChangeText={(v) => setPet({ vetClinic: v })} />
          <Input className="mt-2" placeholder="Phone" keyboardType="phone-pad" value={pet.vetPhone ?? ""} onChangeText={(v) => setPet({ vetPhone: v })} />
        </Card>

        <Card>
          <Eyebrow>Emergency / after-hours vet</Eyebrow>
          <Input className="mt-2" placeholder="Clinic name" value={pet.emergVetClinic ?? ""} onChangeText={(v) => setPet({ emergVetClinic: v })} />
          <Input className="mt-2" placeholder="Phone" keyboardType="phone-pad" value={pet.emergVetPhone ?? ""} onChangeText={(v) => setPet({ emergVetPhone: v })} />
        </Card>

        <Card>
          <Eyebrow>Insurance</Eyebrow>
          <Input className="mt-2" placeholder="Provider" value={pet.insuranceProvider ?? ""} onChangeText={(v) => setPet({ insuranceProvider: v })} />
          <Input className="mt-2" placeholder="Policy number" value={pet.insurancePolicy ?? ""} onChangeText={(v) => setPet({ insurancePolicy: v })} />
        </Card>

        <Card>
          <Eyebrow>Backup contact</Eyebrow>
          <Input className="mt-2" placeholder="Name" value={pet.backupName ?? ""} onChangeText={(v) => setPet({ backupName: v })} />
          <Input className="mt-2" placeholder="Relationship (e.g. sister)" value={pet.backupRelationship ?? ""} onChangeText={(v) => setPet({ backupRelationship: v })} />
          <Input className="mt-2" placeholder="Phone" keyboardType="phone-pad" value={pet.backupPhone ?? ""} onChangeText={(v) => setPet({ backupPhone: v })} />
          <CheckboxRow
            label="I have permission to share this person's contact info."
            checked={pet.backupConsent ?? false}
            onToggle={(v) => setPet({ backupConsent: v })}
          />
        </Card>
      </View>

      <View style={{ marginTop: 32, gap: 8 }}>
        <PrimaryButton label="Save and continue" onPress={() => router.push("/onboarding/pin")} />
        <SkipButton label="Skip for now" onPress={() => router.push("/onboarding/pin")} />
      </View>
    </ScrollView>
  );
}
