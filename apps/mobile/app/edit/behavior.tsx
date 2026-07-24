// Edit commands, quirks, escape risk
import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card, FieldTier } from "../../components/ui";
import { colors } from "@quirksandall/shared";
import type { Command } from "@quirksandall/shared";
import { router, useLocalSearchParams } from "expo-router";

export default function EditBehavior() {
  const { petId, pet, loading } = useActivePet();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const quirksY = useRef(0);

  const [commands, setCommands] = useState<Command[]>([]);
  const [scared, setScared] = useState("");
  const [noGo, setNoGo] = useState("");
  const [flightRisk, setFlightRisk] = useState("");
  const [temperament, setTemperament] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  // Paid-gated fields carry the "Unlock to share" pill for free owners.
  const softLocked = !isPaid;

  // Deep-link from the dashboard "Quirks & Triggers" row → scroll to that block.
  useEffect(() => {
    if (loading || section !== "quirks") return;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y: quirksY.current, animated: true }), 350);
    return () => clearTimeout(t);
  }, [loading, section]);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
      const [{ data }, { data: owner }] = await Promise.all([
        supabase.from("pet_behavior").select("commands, scared, no_go, flight_risk, temperament_summary").eq("pet_id", petId).single(),
        supabase.from("owners").select("purchase_status").eq("id", user!.id).single(),
      ]);
      setIsPaid(owner?.purchase_status === "paid");
      if (!data) return;
      setCommands(
        (data.commands ?? []).map((c: any, i: number) => ({ ...c, id: c.id ?? String(i + 1) }))
      );
      setScared(data.scared ?? "");
      setNoGo(data.no_go ?? "");
      setFlightRisk(data.flight_risk ?? "");
      setTemperament(data.temperament_summary ?? "");
    })();
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
      // Saving is an implicit "still accurate" confirmation — stamp each command
      // so the dashboard's 21-day freshness nudge resets (#54).
      const now = new Date().toISOString();
      const stamped = commands.map((c) => ({ ...c, lastConfirmedAt: now }));
      const { error } = await supabase.from("pet_behavior").upsert({
        pet_id: petId,
        commands: stamped,
        scared,
        no_go: noGo,
        flight_risk: flightRisk,
        escape_risk: { flag: !!flightRisk.trim(), notes: flightRisk },
        temperament_summary: temperament,
      }, { onConflict: "pet_id" });
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
    <EditShell title="Commands & Quirks" onSave={save} saving={saving} loading={loading} scrollRef={scrollRef}>
      {/* Commands section */}
      <Text
        style={{ fontFamily: "Tanker", fontSize: 24, lineHeight: 28, color: colors.textDark, marginBottom: 4 }}
      >
        Commands
      </Text>

      <View style={{ gap: 10, marginTop: 12 }}>
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
      <View style={{ marginTop: 28, gap: 12 }} onLayout={(e) => { quirksY.current = e.nativeEvent.layout.y; }}>
        <Text
          style={{ fontFamily: "Tanker", fontSize: 24, lineHeight: 28, color: colors.textDark, marginBottom: 4 }}
        >
          Quirks & Triggers
        </Text>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Eyebrow>Scared of anything?</Eyebrow>
            {softLocked && <FieldTier />}
          </View>
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Eyebrow>Anywhere they shouldn't go?</Eyebrow>
            {softLocked && <FieldTier />}
          </View>
          <Input
            className="mt-2"
            placeholder="The back bedroom…"
            value={noGo}
            onChangeText={setNoGo}
            multiline
            style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
          />
        </Card>

        <Card>
          <Eyebrow>Do they bolt if they get the chance?</Eyebrow>
          <Input
            className="mt-2"
            placeholder="Yes / No — and what to watch for"
            value={flightRisk}
            onChangeText={setFlightRisk}
            multiline
            style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
          />
        </Card>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Eyebrow>What's their temperament like?</Eyebrow>
            {softLocked && <FieldTier />}
          </View>
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
