// Screen 3 — Behavior / quirks
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Headline, Input, PrimaryButton, SkipButton, ProgressDots, Eyebrow, Card } from "../../components/ui";
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

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <ProgressDots total={4} current={2} />

      <Headline className="mt-5 mb-1">
        {pet.name ? `${pet.name}'s got words.` : "What does your pet know?"}
      </Headline>
      <Text className="text-text-muted text-sm leading-relaxed mb-6">
        Commands, quirks, the things that make them them.
      </Text>

      {/* Commands */}
      <Eyebrow>Commands</Eyebrow>
      <View style={{ gap: 10, marginTop: 8, marginBottom: 4 }}>
        {commands.map((cmd, i) => (
          <Card key={cmd.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Command {i + 1}</Text>
              {commands.length > 1 && (
                <TouchableOpacity onPress={() => removeCommand(cmd.id)}>
                  <Text style={{ color: colors.danger, fontSize: 18, lineHeight: 18 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            <Input placeholder="Word (e.g. Settle)" value={cmd.word} onChangeText={(v) => updateCommand(cmd.id, "word", v)} />
            <Input className="mt-2" placeholder="Means…" value={cmd.meaning} onChangeText={(v) => updateCommand(cmd.id, "meaning", v)} />
            <Input className="mt-2" placeholder="Reward" value={cmd.reward} onChangeText={(v) => updateCommand(cmd.id, "reward", v)} />
          </Card>
        ))}
      </View>
      <TouchableOpacity onPress={addCommand} style={{ paddingVertical: 10 }}>
        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "600" }}>+ Add another word</Text>
      </TouchableOpacity>

      {/* Quirks */}
      <View style={{ marginTop: 16, gap: 12 }}>
        <View>
          <Eyebrow>Scared of anything?</Eyebrow>
          <Input className="mt-1" placeholder="Skateboards and anything on wheels…" value={pet.scared ?? ""} onChangeText={(v) => setPet({ scared: v })} />
        </View>
        <View>
          <Eyebrow>Anywhere they shouldn't go?</Eyebrow>
          <Input className="mt-1" placeholder="The back bedroom…" value={pet.noGo ?? ""} onChangeText={(v) => setPet({ noGo: v })} />
        </View>
        <View>
          <Eyebrow>A flight risk if a door's left open?</Eyebrow>
          <Input className="mt-1" placeholder="Yes / No / Notes…" value={pet.flightRisk ?? ""} onChangeText={(v) => setPet({ flightRisk: v })} />
        </View>
      </View>

      <View style={{ marginTop: 32, gap: 8 }}>
        <PrimaryButton label="Save and continue" onPress={() => router.push("/onboarding/step4")} />
        <SkipButton label="Skip for now" onPress={() => router.push("/onboarding/step4")} />
      </View>
    </ScrollView>
  );
}
