// PIN setup — owner-facing so brand voice is fine
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Headline, PrimaryButton, SkipButton } from "../../components/ui";
import { useOnboardingStore } from "../../stores/onboarding";
import { colors } from "@quirksandall/shared";

export default function PINSetup() {
  const { setPet } = useOnboardingStore();
  const [stage, setStage] = useState<"set" | "confirm">("set");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const current = stage === "set" ? pin : confirm;

  const handleChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (stage === "set") {
      setPin(digits);
      if (digits.length === 4) setTimeout(() => setStage("confirm"), 300);
    } else {
      setConfirm(digits);
      if (digits.length === 4) {
        if (digits === pin) {
          setTimeout(() => { setPet({ pin: digits }); router.push("/onboarding/step3"); }, 300);
        } else {
          setMismatch(true);
          setTimeout(() => { setConfirm(""); setMismatch(false); }, 900);
        }
      }
    }
  };

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Headline>Lock the emergency contacts.</Headline>
      <Text className="text-text-muted text-sm leading-relaxed mt-2 mb-3">
        Only people with the PIN can see that block. The link still works without it.
      </Text>
      <View style={{ backgroundColor: colors.cardDark, borderRadius: 10, padding: 12, marginBottom: 24 }}>
        <Text style={{ color: "rgba(248,236,238,0.8)", fontSize: 12, lineHeight: 18 }}>
          The link's the door. The PIN's the key.{" "}
          <Text style={{ color: "#F8ECEE", fontFamily: "Satoshi-Medium" }}>Send them separately.</Text>
        </Text>
      </View>

      <Text className="eyebrow text-text-muted mb-3">
        {stage === "set" ? "Choose a 4-digit PIN" : mismatch ? "That didn't match. Try again." : "Confirm your PIN"}
      </Text>

      <View style={{ flexDirection: "row", gap: 10, position: "relative" }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1, height: 56, borderRadius: 10, borderWidth: 2,
              alignItems: "center", justifyContent: "center",
              borderColor: mismatch ? colors.danger : i < current.length ? colors.button : i === current.length ? colors.primary : colors.border,
              backgroundColor: mismatch ? "rgba(184,112,112,0.1)" : i < current.length ? colors.button : colors.cardBg,
            }}
          >
            {i < current.length && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#F8ECEE" }} />}
          </View>
        ))}
        <TextInput
          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%" }}
          value={current}
          onChangeText={handleChange}
          keyboardType="numeric"
          maxLength={4}
          autoFocus
        />
      </View>

      <View style={{ marginTop: 32, gap: 8 }}>
        <SkipButton label="Skip — no PIN for now" onPress={() => router.push("/onboarding/step3")} />
      </View>
    </View>
  );
}
