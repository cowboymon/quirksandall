// Edit commands, quirks, escape risk
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card } from "../../components/ui";
import { colors } from "@quirksandall/shared";
import type { Command } from "@quirksandall/shared";
import { router } from "expo-router";

export default function EditBehavior() {
  const { petId, pet, loading } = useActivePet();

  const [commands, setCommands] = useState<Command[]>([]);
  const [scared, setScared] = useState("");
  const [noGo, setNoGo] = useState("");
  const [flightRisk, setFlightRisk] = useState("");
  const [temperament, setTemperament] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!petId) return;
    supabase
      .from("pet_behavior")
      .select("commands, scared, no_go, flight_risk, temperament_summary")
      .eq("pet_id", petId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setCommands(
          (data.commands ?? []).map((c: any, i: number) => ({ ...c, id: c.id ?? String(i + 1) }))
        );
        setScared(data.scared ?? "");
        setNoGo(data.no_go ?? "");
        setFlightRisk(data.flight_risk ?? "");
        setTemperament(data.temperament_summary ?? "");
      });
  }, [petId]);

  const addCommand = () =>
    setCommands((prev) => [...prev, { id: Date.now().toString(), word: "", meaning: "", reward: "", howToCue: "" }]);

  const updateCmd = (id: string, field: keyof Command, val: string) =>
    setCommands((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));

  const removeCmd = (id: string) =>
    setCommands((prev) => prev.filter((c) => c.id !== id));

  const save = async () => {
    if (!petId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("pet_behavior").upsert({
        pet_id: petId,
        commands,
        scared,
        no_go: noGo,
        flight_risk: flightRisk,
        escape_risk: { flag: !!flightRisk.trim(), notes: flightRisk },
        temperament_summary: temperament,
      });
      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  const petName = pet?.name ?? "your pet";

  return (
    <EditShell title="Commands & quirks" onSave={save} saving={saving} loading={loading}>
      {/* Commands section */}
      <Text
        style={{ fontFamily: "Spectral_700BoldItalic", fontSize: 22, color: colors.primary, marginBottom: 4 }}
      >
        {petName}'s got words.
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
        Commands your sitter needs to know — word, what it means, what the reward is.
      </Text>

      <View style={{ gap: 10 }}>
        {commands.map((cmd, i) => (
          <Card key={cmd.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Eyebrow>Command {i + 1}</Eyebrow>
              {commands.length > 0 && (
                <TouchableOpacity onPress={() => removeCmd(cmd.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: colors.danger, fontSize: 20, lineHeight: 20 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            <Input
              placeholder="Word (e.g. Settle)"
              value={cmd.word}
              onChangeText={(v) => updateCmd(cmd.id, "word", v)}
            />
            <Input
              className="mt-2"
              placeholder="Means…"
              value={cmd.meaning}
              onChangeText={(v) => updateCmd(cmd.id, "meaning", v)}
            />
            <Input
              className="mt-2"
              placeholder="How to cue (optional)"
              value={cmd.howToCue}
              onChangeText={(v) => updateCmd(cmd.id, "howToCue", v)}
            />
            <Input
              className="mt-2"
              placeholder="Reward"
              value={cmd.reward}
              onChangeText={(v) => updateCmd(cmd.id, "reward", v)}
            />
          </Card>
        ))}
      </View>

      <TouchableOpacity
        onPress={addCommand}
        style={{
          height: 44, borderRadius: 10, borderWidth: 1.5,
          borderColor: colors.dashedBorder, borderStyle: "dashed",
          alignItems: "center", justifyContent: "center", marginTop: 10,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>+ Add another word</Text>
      </TouchableOpacity>

      {/* Quirks section */}
      <View style={{ marginTop: 28, gap: 12 }}>
        <Text
          style={{ fontFamily: "Spectral_700BoldItalic", fontSize: 20, color: colors.primary, marginBottom: 4 }}
        >
          Quirks & triggers
        </Text>

        <Card>
          <Eyebrow>Scared of anything?</Eyebrow>
          <Input
            className="mt-2"
            placeholder={`Skateboards — ${petName} will lunge.`}
            value={scared}
            onChangeText={setScared}
            multiline
            style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
          />
        </Card>

        <Card>
          <Eyebrow>Anywhere they shouldn't go?</Eyebrow>
          <Input
            className="mt-2"
            placeholder="The back bedroom…"
            value={noGo}
            onChangeText={setNoGo}
            multiline
            style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
          />
        </Card>

        <Card style={{ borderColor: flightRisk.trim() ? colors.caution : colors.border }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Eyebrow>Flight risk if a door's left open?</Eyebrow>
            {flightRisk.trim() && (
              <Text style={{ fontSize: 11, color: colors.caution, fontWeight: "600" }}>⚠ Flagged</Text>
            )}
          </View>
          <Input
            className="mt-2"
            placeholder="Yes / No — and what to watch for"
            value={flightRisk}
            onChangeText={setFlightRisk}
            multiline
            style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
          />
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
            Shown to all recipients regardless of tier — safety override.
          </Text>
        </Card>

        <Card>
          <Eyebrow>Temperament summary (full view only)</Eyebrow>
          <Input
            className="mt-2"
            placeholder="Friendly but anxious with strangers. Needs 10 minutes to settle."
            value={temperament}
            onChangeText={setTemperament}
            multiline
            style={{ height: 88, paddingTop: 10, textAlignVertical: "top" }}
          />
        </Card>
      </View>
    </EditShell>
  );
}
