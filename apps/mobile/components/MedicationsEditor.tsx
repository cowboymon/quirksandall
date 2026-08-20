// Structured medication entries — shared by onboarding step 4 and
// edit/routine.tsx so the two never drift again (onboarding used to collect
// medications as one free-text blob while editing had this structured form,
// so anything entered at onboarding lost its dose/timing once you went to
// edit it).
import { View, Text, TouchableOpacity } from "react-native";
import { Input, Eyebrow, Card } from "./ui";
import { Trash } from "./icons";
import { colors } from "@quirksandall/shared";
import type { MealSlot } from "@quirksandall/shared";

export type EditableMedication = { id: string; name: string; dose: string; withMeal?: MealSlot[]; notes: string };

const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "anytime", label: "Anytime" },
];

export function newMedication(): EditableMedication {
  return { id: Date.now().toString(), name: "", dose: "", notes: "" };
}

export default function MedicationsEditor({ meds, onChange }: { meds: EditableMedication[]; onChange: (meds: EditableMedication[]) => void }) {
  const addMed = () => onChange([...meds, newMedication()]);
  const updateMed = (id: string, field: "name" | "dose" | "notes", val: string) =>
    onChange(meds.map((m) => (m.id === id ? { ...m, [field]: val } : m)));
  // Multi-select (#94 follow-up) — a medication given at both breakfast and
  // dinner is one row with both slots on, not two rows with the same dose
  // that can drift apart. "Anytime" is exclusive of the others: it means
  // there's no fixed slot, which is a different fact than "every slot".
  const setMedMeal = (id: string, slot: MealSlot) =>
    onChange(meds.map((m) => {
      if (m.id !== id) return m;
      const current = m.withMeal ?? [];
      if (slot === "anytime") return { ...m, withMeal: current.includes("anytime") ? undefined : ["anytime"] };
      const withoutAnytime = current.filter((s) => s !== "anytime");
      const withMeal = withoutAnytime.includes(slot) ? withoutAnytime.filter((s) => s !== slot) : [...withoutAnytime, slot];
      return { ...m, withMeal: withMeal.length ? withMeal : undefined };
    }));
  const removeMed = (id: string) => onChange(meds.filter((m) => m.id !== id));

  return (
    <Card>
      <Eyebrow>Medications</Eyebrow>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4, marginBottom: 4 }}>
        Add each one, and when it's given.
      </Text>
      {/* Wider gap between entries than within one, since the cards no longer
          have borders to separate them. */}
      <View style={{ gap: 20, marginTop: 4 }}>
        {meds.map((m, i) => (
          // No border/padding of its own — a bordered box inside the section's
          // own bordered Card read as a stray rectangle, especially against
          // the borderless Treats entries directly above. Same structure as
          // Treats now: a label + delete header, then plain stacked fields.
          <View key={m.id} style={{ gap: 8 }}>
            {/* Delete belongs here rather than beside the dose field: it
                removes the whole medication, not one value — and sitting
                inline it read as part of the form and crowded the dose. */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.textMuted }}>
                Medication {i + 1}
              </Text>
              <TouchableOpacity onPress={() => removeMed(m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash size={15} color={colors.danger} />
              </TouchableOpacity>
            </View>
            {/* Stacked full-width rather than side by side, matching Treats.
                Sharing one row is what kept truncating the dose — "1 teaspoon"
                didn't fit at any split that still left the name readable. */}
            <Input placeholder="Name (e.g. Apoquel)" value={m.name} onChangeText={(v) => updateMed(m.id, "name", v)} />
            <Input placeholder="Dose — e.g. 1 tablet" value={m.dose} onChangeText={(v) => updateMed(m.id, "dose", v)} />
            {/* Grows with its content. A fixed height needs truncation to
                look right, and a multiline TextInput can't ellipsize — the
                Text-overlay workaround for that was more machinery than the
                tidiness was worth. */}
            <Input
              placeholder="Cut into smaller pieces — she won't take it whole."
              value={m.notes}
              onChangeText={(v) => updateMed(m.id, "notes", v)}
              multiline
              style={{ minHeight: 44, paddingTop: 10, textAlignVertical: "top" }}
            />
            <Text style={{ color: colors.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Satoshi-Medium" }}>
              When given
            </Text>
            {/* Compact pills, matching the quick-add command chips. These are
                a multi-select, not a primary action — at full plum fill and
                button size they outweighed the medication name, which is the
                most important thing on the card. Selected state is the rose
                tint rather than a solid fill, which leaves plum to mean
                "primary action" everywhere else. */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {MEAL_SLOTS.map((s) => {
                const active = (m.withMeal ?? []).includes(s.key);
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setMedMeal(m.id, s.key)}
                    activeOpacity={0.85}
                    style={{
                      paddingHorizontal: 12, height: 28, borderRadius: 14,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: active ? "rgba(184,58,82,0.10)" : "#FFFFFF",
                      borderWidth: 1, borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: active ? colors.primary : colors.textMuted, fontSize: 12, fontFamily: active ? "Satoshi-Bold" : "Satoshi-Medium" }}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity
        onPress={addMed}
        style={{ height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: colors.dashedBorder, borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginTop: 12 }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>+ Add a medication</Text>
      </TouchableOpacity>
    </Card>
  );
}

// Shared shape → DB row mapping, so onboarding's finish() and edit/routine's
// save() write medications identically.
export function medsToRows(meds: EditableMedication[]) {
  return meds
    .filter((m) => m.name.trim())
    .map((m) => ({
      name: m.name.trim(), dose: m.dose.trim(), frequency: "", time_of_day: "", location_stored: "",
      notes: m.notes.trim(), with_meal: m.withMeal ?? null,
    }));
}

export function rowsToMeds(rows: any[]): EditableMedication[] {
  return (rows ?? []).map((m: any, i: number) => ({
    id: String(i),
    name: m.name ?? "",
    dose: m.dose ?? "",
    // Rows written before withMeal became an array (#94 follow-up) have a
    // bare string here — wrap it so old data still loads into the editor.
    withMeal: m.with_meal == null ? undefined : Array.isArray(m.with_meal) ? m.with_meal : [m.with_meal],
    notes: m.notes ?? "",
  }));
}
