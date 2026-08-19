// Edit commands, quirks, escape risk
import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { CaretDown, CaretRight, CaretUp, Eye, EyeSlash } from "../../components/icons";
import { AppAlert } from "../../stores/appAlert";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card, FieldTier } from "../../components/ui";
import ConfirmModal from "../../components/ConfirmModal";
import { colors, orderedCommands, isUnlocked, SUGGESTED_COMMANDS } from "@quirksandall/shared";
import type { Command, CommandStrength } from "@quirksandall/shared";

const STRENGTHS: { key: CommandStrength; label: string }[] = [
  { key: "learning", label: "Still learning" },
  { key: "solid", label: "Solid" },
  { key: "mastered", label: "Mastered" },
];
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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // #19 — past COLLAPSE_AFTER commands the list becomes an accordion: every
  // entry is a condensed one-line row except the single one being worked on.
  // Adding or quick-adding a command makes it the open one.
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        supabase.from("owners").select("purchase_status, expires_at").eq("id", user!.id).single(),
      ]);
      setIsPaid(isUnlocked(owner));
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

  const addCommand = () => {
    const id = Date.now().toString();
    setExpandedId(id);
    setCommands((prev) => [...prev, { id, word: "", meaning: "", reward: "", howToCue: "" }]);
  };

  // #18 — quick-add a common command with word + meaning pre-filled. Reward is
  // deliberately left blank (pet-specific); everything stays editable. Fills a
  // blank card if one is open (e.g. "+ Add another word" was tapped first)
  // rather than leaving it stranded above the chip's result.
  const quickAdd = (word: string, meaning: string) => {
    setCommands((prev) => {
      const blank = prev.find((c) => !c.word.trim() && !c.meaning.trim());
      if (blank) {
        setExpandedId(blank.id);
        return prev.map((c) => (c.id === blank.id ? { ...c, word, meaning } : c));
      }
      const id = Date.now().toString();
      setExpandedId(id);
      return [...prev, { id, word, meaning, reward: "", howToCue: "" }];
    });
  };

  // Accordion: opening one closes the rest; tapping the open one closes it.
  const toggleExpanded = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  const updateCmd = (id: string, field: keyof Command, val: string) =>
    setCommands((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));

  const removeCmd = (id: string) =>
    setCommands((prev) => prev.filter((c) => c.id !== id));

  // Strength tag (#92, free) — tap the current one again to clear it.
  const setStrength = (id: string, strength: CommandStrength) =>
    setCommands((prev) => prev.map((c) => (c.id === id ? { ...c, strength: c.strength === strength ? undefined : strength } : c)));

  // Paid organisation controls.
  const toggleHide = (id: string) =>
    setCommands((prev) => prev.map((c) => (c.id === id ? { ...c, hidden: !c.hidden } : c)));
  // Reorder a visible command up/down within the owner's manual order.
  const move = (id: string, dir: -1 | 1) =>
    setCommands((prev) => {
      const vis = orderedCommands(prev, true, false);
      const i = vis.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= vis.length) return prev;
      const arr = prev.slice();
      const ai = arr.findIndex((c) => c.id === vis[i].id);
      const aj = arr.findIndex((c) => c.id === vis[j].id);
      [arr[ai], arr[aj]] = [arr[aj], arr[ai]];
      return arr;
    });

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
      AppAlert.alert("Couldn't save", e.message);
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

      {/* Free owners can add unlimited commands, but organising them
          (favourite / reorder / hide) is a paid control. */}
      {!isPaid && commands.length > 1 && (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, fontFamily: "Satoshi-Light" }}>
          Shown oldest-first. Unlock to reorder and hide commands.
        </Text>
      )}

      {/* #18 — quick-add chips for the obvious commands. A suggestion
          disappears once a command with that word exists, so nothing is
          offered twice. Sits right under the heading rather than below the
          cards — the more commands you've added, the further a
          bottom-anchored version would sink, which is backwards for a
          shortcut meant to stay reachable. No "Quick add" label — every
          other eyebrow-style label in the app lives inside a card, never
          floating directly under a section heading, and the chips are
          self-explanatory without one. */}
      {(() => {
        const have = new Set(commands.map((c) => c.word.trim().toLowerCase()).filter(Boolean));
        const remaining = SUGGESTED_COMMANDS.filter((sug) => !have.has(sug.word.toLowerCase()));
        return (
          <View style={{ marginTop: 12 }}>
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

      <View style={{ gap: 10, marginTop: 14 }}>
        {(() => {
          const visible = orderedCommands(commands, isPaid, false);
          const ordered = orderedCommands(commands, isPaid, true);
          return ordered.map((cmd, i) => {
            const vi = visible.findIndex((c) => c.id === cmd.id);
            const canUp = isPaid && vi > 0;
            const canDown = isPaid && vi >= 0 && vi < visible.length - 1;
            // The hidden commands are appended after the visible ones — mark
            // where that section starts so it's obvious where a hidden command
            // "goes" (rather than looking like it vanished).
            const firstHidden = cmd.hidden && i === visible.length;
            // #19 — condensed one-line row once the list is long, expanded on tap.
            const collapsed = ordered.length > 2 && expandedId !== cmd.id;
            return (
            <View key={cmd.id} style={{ gap: 10 }}>
              {firstHidden && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <EyeSlash size={14} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Hidden — only you can see these
                  </Text>
                </View>
              )}
              {collapsed ? (
                <TouchableOpacity onPress={() => toggleExpanded(cmd.id)} activeOpacity={0.8}>
                  <Card style={[{ paddingVertical: 12 }, cmd.hidden ? { opacity: 0.6 } : null]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: colors.textDark, fontFamily: "Satoshi" }}>
                        <Text style={{ fontFamily: "Satoshi-Bold" }}>{cmd.word || "Unnamed"}</Text>
                        {cmd.meaning ? ` → ${cmd.meaning}` : ""}
                      </Text>
                      {/* Reorder/hide stay reachable without expanding — a long
                          list is exactly when reordering is wanted (#19). */}
                      {isPaid && !cmd.hidden && (
                        <>
                          <TouchableOpacity onPress={() => move(cmd.id, -1)} disabled={!canUp} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <CaretUp size={18} color={canUp ? colors.textMuted : colors.border} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => move(cmd.id, 1)} disabled={!canDown} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <CaretDown size={18} color={canDown ? colors.textMuted : colors.border} />
                          </TouchableOpacity>
                        </>
                      )}
                      {isPaid && (
                        <TouchableOpacity onPress={() => toggleHide(cmd.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          {cmd.hidden ? <EyeSlash size={17} color={colors.textMuted} /> : <Eye size={17} color={colors.textMuted} />}
                        </TouchableOpacity>
                      )}
                      <CaretRight size={14} color={colors.textMuted} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ) : (
              <Card style={cmd.hidden ? { opacity: 0.6 } : undefined}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Eyebrow>{cmd.hidden ? "Hidden from sitters" : `Command ${vi + 1}`}</Eyebrow>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    {isPaid && !cmd.hidden && (
                      <>
                        <TouchableOpacity onPress={() => move(cmd.id, -1)} disabled={!canUp} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <CaretUp size={18} color={canUp ? colors.textMuted : colors.border} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => move(cmd.id, 1)} disabled={!canDown} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <CaretDown size={18} color={canDown ? colors.textMuted : colors.border} />
                        </TouchableOpacity>
                      </>
                    )}
                    {isPaid && (
                      <TouchableOpacity onPress={() => toggleHide(cmd.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        {cmd.hidden ? <EyeSlash size={17} color={colors.textMuted} /> : <Eye size={17} color={colors.textMuted} />}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setDeleteTarget(cmd.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ color: colors.danger, fontSize: 20, lineHeight: 20 }}>×</Text>
                    </TouchableOpacity>
                  </View>
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
              )}
            </View>
            );
          });
        })()}
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
            placeholder="e.g. Doors, gates, slipped leads — always check the latch."
            value={flightRisk}
            onChangeText={setFlightRisk}
            multiline
            style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
          />
        </Card>
      </View>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete this command?"
        message="This removes the command permanently — there's no undo."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteTarget) removeCmd(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </EditShell>
  );
}
