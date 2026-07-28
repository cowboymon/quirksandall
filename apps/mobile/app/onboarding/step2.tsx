// Screen 2 — Emergency essentials
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Headline, LabeledInput, InlineNote, PrimaryButton, SkipButton, ProgressDots, Eyebrow, Card, BackButton } from "../../components/ui";
import { LabeledPlacesInput } from "../../components/PlacesInput";
import { useOnboardingStore } from "../../stores/onboarding";
import { colors } from "@quirksandall/shared";
import CheckboxRow from "../../components/CheckboxRow";

export default function Step2() {
  const { pet, setPet } = useOnboardingStore();
  const [showSecondBackup, setShowSecondBackup] = useState(!!(pet.backup2Name || pet.backup2Phone));

  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 24, paddingTop: 60, width: "100%", maxWidth: 600, alignSelf: "center" }}>
      <BackButton />
      <ProgressDots total={4} current={2} />

      <View style={{ marginTop: 20, marginBottom: 6 }}><Eyebrow>Step 2 of 4</Eyebrow></View>
      <Headline className="mb-1">What {pet.name?.trim() || "your pet"}'s stand-in needs to know most.</Headline>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 12, fontFamily: "Satoshi-Light" }}>
        This is the information that matters.
      </Text>
      <View style={{ marginBottom: 20 }}>
        <InlineNote>Recipients see this block only after entering your PIN. No personality here — plain labels, clear numbers.</InlineNote>
      </View>

      <View style={{ gap: 12 }}>
        <Card>
          <Eyebrow bold>Vet</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledInput name label="Vet name" placeholder="e.g. Dr. Sarah Mitchell" value={pet.vetContactName ?? ""} onChangeText={(v) => setPet({ vetContactName: v })} />
            <LabeledPlacesInput
              label="Clinic"
              placeholder="Search clinic name"
              value={pet.vetClinic ?? ""}
              onChangeText={(v) => setPet({ vetClinic: v })}
              onSelectPlace={(p) => setPet({ vetClinic: p.name, ...(p.phone ? { vetPhone: p.phone } : {}), ...(p.address ? { vetAddress: p.address } : {}) })}
            />
            <LabeledInput label="Address" placeholder="Address" value={pet.vetAddress ?? ""} onChangeText={(v) => setPet({ vetAddress: v })} />
            <LabeledInput label="Phone" placeholder="Phone" phone keyboardType="phone-pad" value={pet.vetPhone ?? ""} onChangeText={(v) => setPet({ vetPhone: v })} />
          </View>
        </Card>

        <Card>
          <Eyebrow bold>Emergency vet</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledInput label="Clinic" placeholder="Clinic name" value={pet.emergVetClinic ?? ""} onChangeText={(v) => setPet({ emergVetClinic: v })} />
            <LabeledInput label="Phone" placeholder="Phone" phone keyboardType="phone-pad" value={pet.emergVetPhone ?? ""} onChangeText={(v) => setPet({ emergVetPhone: v })} />
          </View>
        </Card>

        <Card>
          <Eyebrow bold>Insurance</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledInput label="Provider" placeholder="Provider" value={pet.insuranceProvider ?? ""} onChangeText={(v) => setPet({ insuranceProvider: v })} />
            <LabeledInput label="Policy number" placeholder="Policy number" value={pet.insurancePolicy ?? ""} onChangeText={(v) => setPet({ insurancePolicy: v })} />
          </View>
        </Card>

        <Card>
          <Eyebrow bold>Backup contact</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            <LabeledInput name label="Name" placeholder="Name" value={pet.backupName ?? ""} onChangeText={(v) => setPet({ backupName: v })} />
            <LabeledInput label="Relationship" placeholder="e.g. sister" value={pet.backupRelationship ?? ""} onChangeText={(v) => setPet({ backupRelationship: v })} />
            <LabeledInput label="Phone" placeholder="Phone" phone keyboardType="phone-pad" value={pet.backupPhone ?? ""} onChangeText={(v) => setPet({ backupPhone: v })} />
          </View>
          <CheckboxRow
            label="I have permission to share this person's contact info."
            checked={pet.backupConsent ?? false}
            onToggle={(v) => setPet({ backupConsent: v })}
          />
          <CheckboxRow
            label="Can make care decisions if I'm unreachable."
            checked={pet.backupIsDecisionContact ?? false}
            onToggle={(v) => setPet({ backupIsDecisionContact: v })}
          />
        </Card>

        {/* Second backup — prompt or expanded */}
        {!showSecondBackup ? (
          <TouchableOpacity
            onPress={() => setShowSecondBackup(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.dashedBorder, borderStyle: "dashed" }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 18, lineHeight: 18 }}>+</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>Add another backup contact</Text>
          </TouchableOpacity>
        ) : (
          <Card>
            <Eyebrow bold>Second backup contact</Eyebrow>
            <View style={{ gap: 8, marginTop: 12 }}>
              <LabeledInput name label="Name" placeholder="Name" value={pet.backup2Name ?? ""} onChangeText={(v) => setPet({ backup2Name: v })} />
              <LabeledInput label="Relationship" placeholder="e.g. neighbour" value={pet.backup2Relationship ?? ""} onChangeText={(v) => setPet({ backup2Relationship: v })} />
              <LabeledInput label="Phone" placeholder="Phone" phone keyboardType="phone-pad" value={pet.backup2Phone ?? ""} onChangeText={(v) => setPet({ backup2Phone: v })} />
            </View>
            <CheckboxRow
              label="I have permission to share this person's contact info."
              checked={pet.backup2Consent ?? false}
              onToggle={(v) => setPet({ backup2Consent: v })}
            />
            <CheckboxRow
              label="Can make care decisions if I'm unreachable."
              checked={pet.backup2IsDecisionContact ?? false}
              onToggle={(v) => setPet({ backup2IsDecisionContact: v })}
            />
          </Card>
        )}
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <PrimaryButton label="Save and continue" onPress={() => router.push("/onboarding/pin")} />
        <SkipButton label="Skip for now" onPress={() => router.push("/onboarding/pin")} />
      </View>
    </ScrollView>
  );
}
