// Screen 3 — Behavior / quirks
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { router } from "expo-router";
import { Headline, Textarea, PrimaryButton, SkipButton, ProgressDots, Eyebrow } from "../../components/ui";
import { Underlined } from "../../components/Underlined";
import { useOnboardingStore } from "../../stores/onboarding";
import { colors } from "@quirksandall/shared";
import type { Command } from "@quirksandall/shared";

export default function Step3() {
  const { pet, setPet } = useOnboardingStore();
  const [commands, setCommands] = useState<Command[]>(
    pet.commands ?? [{ id: "1", word: "", meaning: "", reward: "", howToCue: "" }]
  );

  const updateCommand = (id: string, field: keyof Command, val: string) => {
    const updated = commands.map((c) => (c.id === id ? { ...c, [field]: val } : c));
    setCommands(updated);
    setPet({ commands: updated });
  };
  const addCommand = () => {
    const updated = [...commands, { id: Date.now().toString(), word: "", meaning: "", reward: "", howToCue: "" }];
    setCommands(updated);
    setPet({ commands: updated });
  };
  const removeCommand = (id: string) => {
    const updated = commands.filter((c) => c.id !== id);
    setCommands(updated);
    setPet({ commands: updated });
  };

  const filled = commands.filter((c) => c.word.trim()).length;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <ProgressDots total={4} current={3} />

      <View style={{ marginTop: 20, marginBottom: 6 }}><Eyebrow>Step 3 of 4</Eyebrow></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 4 }}>
        <Headline>{pet.name ? `${pet.name}'s ` : "Your pet's "}</Headline>
        <Underlined><Headline>got words.</Headline></Underlined>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 24, fontFamily: "Satoshi-Light" }}>
        The stuff stand-ins learn the hard way — teach it once here.
      </Text>

      {/* Commands */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Eyebrow>Commands</Eyebrow>
        {filled > 0 && (
          <View style={{ backgroundColor: "rgba(184,58,82,0.1)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Satoshi-Medium" }}>{filled}</Text>
          </View>
        )}
      </View>

      <View style={{ gap: 10, marginTop: 8 }}>
        {commands.map((cmd) => (
          <View key={cmd.id} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                placeholder="Word (e.g. Settle)"
                placeholderTextColor={colors.textMuted}
                value={cmd.word}
                onChangeText={(v) => updateCommand(cmd.id, "word", v)}
                style={{ flex: 1, fontFamily: "Satoshi-Bold", fontSize: 16, color: colors.textDark, padding: 0 }}
              />
              {commands.length > 1 && (
                <TouchableOpacity onPress={() => removeCommand(cmd.id)} hitSlop={8}>
                  <Text style={{ color: colors.textMuted, fontSize: 18, lineHeight: 18 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              placeholder="Means…"
              placeholderTextColor={colors.textMuted}
              value={cmd.meaning}
              onChangeText={(v) => updateCommand(cmd.id, "meaning", v)}
              style={{ fontFamily: "Satoshi", fontSize: 14, color: colors.textMuted, padding: 0, marginTop: 6 }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Satoshi-Medium" }}>Reward:</Text>
              <TextInput
                placeholder="what they get"
                placeholderTextColor={colors.textMuted}
                value={cmd.reward}
                onChangeText={(v) => updateCommand(cmd.id, "reward", v)}
                style={{ flex: 1, fontFamily: "Satoshi", fontSize: 13, color: colors.primary, padding: 0 }}
              />
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={addCommand} style={{ paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ color: colors.primary, fontSize: 14, fontFamily: "Satoshi-Medium" }}>+ Add another word</Text>
      </TouchableOpacity>

      {/* Quirks */}
      <View style={{ marginTop: 12, gap: 14 }}>
        <View>
          <Eyebrow>Scared of anything?</Eyebrow>
          <Textarea style={{ marginTop: 4 }} placeholder="Skateboards and anything on wheels…" value={pet.scared ?? ""} onChangeText={(v) => setPet({ scared: v })} />
        </View>
        <View>
          <Eyebrow>Anywhere they shouldn't go?</Eyebrow>
          <Textarea style={{ marginTop: 4 }} placeholder="The back bedroom…" value={pet.noGo ?? ""} onChangeText={(v) => setPet({ noGo: v })} />
        </View>
        <View>
          <Eyebrow>A flight risk if a door's left open?</Eyebrow>
          <Textarea style={{ marginTop: 4 }} placeholder="Yes / No / Notes…" value={pet.flightRisk ?? ""} onChangeText={(v) => setPet({ flightRisk: v })} />
        </View>
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <PrimaryButton label="Save and continue" onPress={() => router.push("/onboarding/step4")} />
        <SkipButton label="Skip for now" onPress={() => router.push("/onboarding/step4")} />
      </View>
    </ScrollView>
  );
}
