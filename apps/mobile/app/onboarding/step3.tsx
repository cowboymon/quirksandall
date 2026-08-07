// Screen 3 — Behavior / quirks
import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Headline, Textarea, Input, Card, PrimaryButton, SkipButton, Eyebrow } from "../../components/ui";
import OnboardingShell from "../../components/OnboardingShell";
import { Underlined } from "../../components/Underlined";
import { useOnboardingStore } from "../../stores/onboarding";
import { colors } from "@quirksandall/shared";
import type { Command, CommandStrength } from "@quirksandall/shared";

const STRENGTHS: { key: CommandStrength; label: string }[] = [
  { key: "learning", label: "Still learning" },
  { key: "solid", label: "Solid" },
  { key: "mastered", label: "Mastered" },
];

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
  const setStrength = (id: string, strength: CommandStrength) => {
    const updated = commands.map((c) => (c.id === id ? { ...c, strength: c.strength === strength ? undefined : strength } : c));
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
    <OnboardingShell step={3}>
      <View style={{ marginBottom: 6 }}><Eyebrow>Step 3 of 4</Eyebrow></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 4 }}>
        <Headline>{pet.name ? `${pet.name}'s ` : "Your pet's "}</Headline>
        <Underlined><Headline>got words.</Headline></Underlined>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 24, fontFamily: "Satoshi-Light" }}>
        The stuff stand-ins learn the hard way. Save them the trouble.
      </Text>

      {/* Commands */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontFamily: "Satoshi-Medium", fontSize: 14, color: colors.textDark }}>
          Commands {pet.name?.trim() ? `${pet.name.trim()} knows` : "they know"}
        </Text>
        <View style={{ backgroundColor: "rgba(184,58,82,0.1)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 }}>
          <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Satoshi-Medium" }}>{filled}</Text>
        </View>
      </View>

      {/* Numbered command cards — same structure as the Dashboard edit screen */}
      <View style={{ gap: 10, marginTop: 8 }}>
        {commands.map((cmd, i) => (
          <Card key={cmd.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Eyebrow>Command {i + 1}</Eyebrow>
              {commands.length > 1 && (
                <TouchableOpacity onPress={() => removeCommand(cmd.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: colors.danger, fontSize: 20, lineHeight: 20 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            <Input placeholder="Word (e.g. Settle)" value={cmd.word} onChangeText={(v) => updateCommand(cmd.id, "word", v)} />
            <Input className="mt-2" placeholder="Means…" value={cmd.meaning} onChangeText={(v) => updateCommand(cmd.id, "meaning", v)} />
            <Input className="mt-2" placeholder="How to cue (optional)" value={cmd.howToCue ?? ""} onChangeText={(v) => updateCommand(cmd.id, "howToCue", v)} />
            <Input className="mt-2" placeholder="Reward" value={cmd.reward} onChangeText={(v) => updateCommand(cmd.id, "reward", v)} />
            {/* Strength tag (#92) — how solid is it? Optional; shown to sitters. */}
            <Text style={{ color: colors.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Satoshi-Medium", marginTop: 12, marginBottom: 6 }}>
              How solid is it?
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {STRENGTHS.map((s) => {
                const active = cmd.strength === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setStrength(cmd.id, s.key)}
                    activeOpacity={0.85}
                    style={{ flex: 1, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: active ? colors.cardDark : colors.secondary, borderWidth: 1, borderColor: active ? colors.cardDark : colors.border }}
                  >
                    <Text style={{ color: active ? colors.cardDarkText : colors.textDark, fontSize: 12, fontFamily: "Satoshi-Medium" }}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        ))}
      </View>
      <TouchableOpacity
        onPress={addCommand}
        style={{ height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: colors.dashedBorder, borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginTop: 10 }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>+ Add another word</Text>
      </TouchableOpacity>

      {/* Quirks & triggers */}
      <View style={{ marginTop: 28 }}>
        <Text style={{ fontFamily: "Satoshi-Medium", fontSize: 14, color: colors.textDark, marginBottom: 12 }}>
          Quirks & triggers
        </Text>
        <View style={{ gap: 14 }}>
          <View>
            <Eyebrow>Scared of anything?</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="e.g. Skateboards, loud machinery…" value={pet.scared ?? ""} onChangeText={(v) => setPet({ scared: v })} />
          </View>
          <View>
            <Eyebrow>Anywhere they shouldn't go?</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="e.g. The back bedroom…" value={pet.noGo ?? ""} onChangeText={(v) => setPet({ noGo: v })} />
          </View>
          <View>
            <Eyebrow>Do they bolt if they get the chance?</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="e.g. Doors, gates, slipped leads — always check the latch." value={pet.flightRisk ?? ""} onChangeText={(v) => setPet({ flightRisk: v })} />
          </View>
          <View>
            <Eyebrow>What's their temperament like?</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="e.g. Shy at first, warms up fast. Loves belly rubs." value={pet.temperament ?? ""} onChangeText={(v) => setPet({ temperament: v })} />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <PrimaryButton label="Save and continue" onPress={() => router.push("/onboarding/step4")} />
        <SkipButton label="Skip for now" onPress={() => router.push("/onboarding/step4")} />
      </View>
    </OnboardingShell>
  );
}
