// Screen 3 — Behavior / quirks
import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Headline, Textarea, Input, Card, PrimaryButton, SkipButton, Eyebrow } from "../../components/ui";
import OnboardingShell from "../../components/OnboardingShell";
import { Underlined } from "../../components/Underlined";
import { CaretRight } from "../../components/icons";
import { useOnboardingStore } from "../../stores/onboarding";
import { colors, SUGGESTED_COMMANDS } from "@quirksandall/shared";
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
  // #19 — past COLLAPSE_AFTER commands the list becomes an accordion: every
  // entry is a condensed one-line row except the single one being worked on.
  // Adding or quick-adding a command makes it the open one. Ported from the
  // Dashboard edit screen (edit/behavior.tsx), which had this but this
  // onboarding screen never did.
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    const id = Date.now().toString();
    const updated = [...commands, { id, word: "", meaning: "", reward: "", howToCue: "" }];
    setCommands(updated);
    setPet({ commands: updated });
    setExpandedId(id);
  };
  const removeCommand = (id: string) => {
    const updated = commands.filter((c) => c.id !== id);
    setCommands(updated);
    setPet({ commands: updated });
  };
  // Accordion: opening one closes the rest; tapping the open one closes it.
  const toggleExpanded = (id: string) => setExpandedId((cur) => (cur === id ? null : id));
  // #18 — quick-add a common command with word + meaning pre-filled. Reward is
  // left blank (pet-specific) and everything stays editable. Fills the first
  // blank card if there is one, so the empty card this screen starts with
  // isn't left stranded above the chip's result.
  const quickAdd = (word: string, meaning: string) => {
    const blank = commands.find((c) => !c.word.trim() && !c.meaning.trim());
    const updated = blank
      ? commands.map((c) => (c.id === blank.id ? { ...c, word, meaning } : c))
      : [...commands, { id: Date.now().toString(), word, meaning, reward: "", howToCue: "" }];
    setCommands(updated);
    setPet({ commands: updated });
    setExpandedId(blank ? blank.id : updated[updated.length - 1].id);
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

      {/* #18 — quick-add chips. A suggestion disappears once a command with
          that word exists, so nothing is offered twice. Sits right under the
          heading rather than below the cards — the more commands you've
          added, the further a bottom-anchored version would sink, which is
          backwards for a shortcut meant to stay reachable. No "Quick add"
          label — every other eyebrow-style label in the app lives inside a
          card (e.g. "SCARED OF ANYTHING?"), never floating directly under a
          section heading, and the chips are self-explanatory without one. */}
      {(() => {
        const have = new Set(commands.map((c) => c.word.trim().toLowerCase()).filter(Boolean));
        const remaining = SUGGESTED_COMMANDS.filter((sug) => !have.has(sug.word.toLowerCase()));
        return (
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {remaining.map((sug) => (
                <TouchableOpacity
                  key={sug.word}
                  onPress={() => quickAdd(sug.word, sug.meaning)}
                  activeOpacity={0.85}
                  style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.textDark, fontSize: 12, fontFamily: "Satoshi-Medium" }}>+ {sug.word}</Text>
                </TouchableOpacity>
              ))}
              {/* A duplicate of the bottom "+ Add another word" button, kept
                  reachable up here too — with the list auto-collapsing (and
                  hidden commands pushing it even further down), the
                  bottom-anchored one alone got buried. */}
              <TouchableOpacity
                onPress={addCommand}
                activeOpacity={0.85}
                style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: colors.dashedBorder, borderStyle: "dashed" }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: "Satoshi-Medium" }}>+ Add a word</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* Numbered command cards — same structure as the Dashboard edit screen */}
      <View style={{ gap: 10, marginTop: 14 }}>
        {commands.map((cmd, i) => {
          // #19 — condensed one-line row once the list is long, expanded on tap.
          const collapsed = commands.length > 2 && expandedId !== cmd.id;
          return collapsed ? (
            <TouchableOpacity key={cmd.id} onPress={() => toggleExpanded(cmd.id)} activeOpacity={0.8}>
              <Card style={{ paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: colors.textDark, fontFamily: "Satoshi" }}>
                    <Text style={{ fontFamily: "Satoshi-Bold" }}>{cmd.word || "Unnamed"}</Text>
                    {cmd.meaning ? ` → ${cmd.meaning}` : ""}
                  </Text>
                  <CaretRight size={14} color={colors.textMuted} />
                </View>
              </Card>
            </TouchableOpacity>
          ) : (
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
          );
        })}
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
            <Eyebrow>What's their temperament like?</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="e.g. Shy at first, warms up fast. Loves belly rubs." value={pet.temperament ?? ""} onChangeText={(v) => setPet({ temperament: v })} />
          </View>
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
        </View>
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <PrimaryButton label="Save and continue" onPress={() => router.push("/onboarding/step4")} />
        <SkipButton label="Skip for now" onPress={() => router.push("/onboarding/step4")} />
      </View>
    </OnboardingShell>
  );
}
