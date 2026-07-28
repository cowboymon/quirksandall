// Structured medication entries — shared by onboarding step 4 and
// edit/routine.tsx so the two never drift again (onboarding used to collect
// medications as one free-text blob while editing had this structured form,
// so anything entered at onboarding lost its dose/timing once you went to
// edit it).
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Input, Eyebrow, Card } from "./ui";
import { colors } from "@quirksandall/shared";
import type { MealSlot } from "@quirksandall/shared";

export type EditableMedication = { id: string; name: string; dose: string; withMeal?: MealSlot; notes: string };

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
  const setMedMeal = (id: string, slot: MealSlot) =>
    onChange(meds.map((m) => (m.id === id ? { ...m, withMeal: m.withMeal === slot ? undefined : slot } : m)));
  const removeMed = (id: string) => onChange(meds.filter((m) => m.id !== id));

  return (
    <Card>
      <Eyebrow>Medications</Eyebrow>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4, marginBottom: 4 }}>
        Add each one, and when it's given.
      </Text>
      <View style={{ gap: 12, marginTop: 4 }}>
        {meds.map((m) => (
          <View key={m.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Input style={{ flex: 2 }} placeholder="Name (e.g. Apoquel)" value={m.name} onChangeText={(v) => updateMed(m.id, "name", v)} />
              <Input style={{ flex: 1 }} placeholder="Dose" value={m.dose} onChangeText={(v) => updateMed(m.id, "dose", v)} />
              <TouchableOpacity onPress={() => removeMed(m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ justifyContent: "center" }}>
                <Text style={{ color: colors.danger, fontSize: 20, lineHeight: 20 }}>×</Text>
              </TouchableOpacity>
            </View>
            <Input
              placeholder="Cut into smaller pieces — she won't take it whole."
              value={m.notes}
              onChangeText={(v) => updateMed(m.id, "notes", v)}
              multiline
              style={{ minHeight: 44, paddingTop: 10, textAlignVertical: "top" }}
            />
            <Text style={{ color: colors.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: "Satoshi-Medium" }}>Given</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {MEAL_SLOTS.map((s) => {
                const active = m.withMeal === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setMedMeal(m.id, s.key)}
                    activeOpacity={0.85}
                    style={{ paddingHorizontal: 12, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: active ? colors.cardDark : colors.secondary, borderWidth: 1, borderColor: active ? colors.cardDark : colors.border }}
                  >
                    <Text style={{ color: active ? colors.cardDarkText : colors.textDark, fontSize: 12, fontFamily: "Satoshi-Medium" }}>{s.label}</Text>
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
    withMeal: m.with_meal ?? undefined,
    notes: m.notes ?? "",
  }));
}
