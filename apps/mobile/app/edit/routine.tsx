// Edit routine + medical. Tier-aware: shows lock indicator on paid-gated sections for free users.
import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { AppAlert } from "../../stores/appAlert";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card, InlineNote, TimeInput, FieldTier, Select } from "../../components/ui";
import { colors, capitalizeFirst, PRICE } from "@quirksandall/shared";
import type { MealSlot } from "@quirksandall/shared";

type Med = { id: string; name: string; dose: string; withMeal?: MealSlot };
const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "anytime", label: "Anytime" },
];

const mealInput = {
  minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8,
  fontSize: 14, fontFamily: "Satoshi", color: colors.textDark,
} as const;

function RoutineMeal({ label, time, amount, onTime, onAmount, divider, defaultPeriod }: {
  label: string; time: string; amount: string;
  onTime: (v: string) => void; onAmount: (v: string) => void; divider: boolean; defaultPeriod?: "AM" | "PM";
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 12, fontFamily: "Satoshi-Bold", color: colors.textDark }}>{label}</Text>
      <TimeInput style={mealInput} placeholder="7:30" value={time} onChangeText={onTime} defaultPeriod={defaultPeriod} />
      <TextInput style={mealInput} placeholder="Amount & brand" placeholderTextColor={colors.textMuted} autoCapitalize="sentences" value={amount} onChangeText={(v) => onAmount(capitalizeFirst(v))} />
    </View>
  );
}

export default function EditRoutine() {
  const { petId, pet, loading } = useActivePet();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const medicalY = useRef(0);

  // Deep-link from the dashboard "Medical" row → scroll to the medical block.
  useEffect(() => {
    if (loading || section !== "medical") return;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y: medicalY.current, animated: true }), 350);
    return () => clearTimeout(t);
  }, [loading, section]);

  // Routine
  const [feedingBrand, setFeedingBrand] = useState("");
  const [breakfastTime, setBreakfastTime] = useState("");
  const [breakfastAmount, setBreakfastAmount] = useState("");
  const [lunchTime, setLunchTime] = useState("");
  const [lunchAmount, setLunchAmount] = useState("");
  const [dinnerTime, setDinnerTime] = useState("");
  const [dinnerAmount, setDinnerAmount] = useState("");
  const [treatsType, setTreatsType] = useState("");
  const [treatsLimit, setTreatsLimit] = useState("");
  const [feedingNotes, setFeedingNotes] = useState("");
  const [walks, setWalks] = useState("");
  const [sleep, setSleep] = useState("");
  const [bathroom, setBathroom] = useState("");
  const [leftAloneOk, setLeftAloneOk] = useState("");
  const [leftAloneDetail, setLeftAloneDetail] = useState("");
  const [toileting, setToileting] = useState("");

  // Medical
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [meds, setMeds] = useState<Med[]>([]);

  const addMed = () => setMeds((prev) => [...prev, { id: Date.now().toString(), name: "", dose: "" }]);
  const updateMed = (id: string, field: "name" | "dose", val: string) =>
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: val } : m)));
  const setMedMeal = (id: string, slot: MealSlot) =>
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, withMeal: m.withMeal === slot ? undefined : slot } : m)));
  const removeMed = (id: string) => setMeds((prev) => prev.filter((m) => m.id !== id));

  const [isPaid, setIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
      const [{ data: owner }, { data: routine }, { data: medical }] = await Promise.all([
        supabase.from("owners").select("purchase_status").eq("id", user!.id).single(),
        supabase.from("pet_routine").select("*").eq("pet_id", petId).single(),
        supabase.from("pet_medical").select("*").eq("pet_id", petId).single(),
      ]);

      setIsPaid(owner?.purchase_status === "paid");

      if (routine) {
        const f = routine.feeding ?? {};
        setFeedingBrand(f.brand ?? "");
        setBreakfastTime(f.breakfast?.time ?? "");
        setBreakfastAmount(f.breakfast?.amount ?? "");
        setLunchTime(f.lunch?.time ?? "");
        setLunchAmount(f.lunch?.amount ?? "");
        setDinnerTime(f.dinner?.time ?? "");
        setDinnerAmount(f.dinner?.amount ?? "");
        setTreatsType(f.treats?.type ?? "");
        setTreatsLimit(f.treats?.limit ?? "");
        setFeedingNotes(f.notes ?? "");
        setWalks(routine.walks ?? "");
        setSleep(routine.sleep ?? "");
        setBathroom(routine.bathroom_habits ?? "");
        setLeftAloneOk(routine.left_alone?.ok ?? "");
        setLeftAloneDetail(routine.left_alone?.detail ?? "");
        setToileting(routine.toileting_frequency ?? "");
      }

      if (medical) {
        setAllergies((medical.allergies ?? []).join(", "));
        setConditions((medical.conditions ?? []).join(", "));
        setMeds(
          (medical.medications ?? []).map((m: any, i: number) => ({
            id: String(i),
            name: m.name ?? "",
            dose: m.dose ?? "",
            withMeal: m.with_meal ?? undefined,
          }))
        );
      }
    })();
  }, [petId]);

  const save = async () => {
    if (!petId) return;
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("pet_routine").upsert({
          pet_id: petId,
          feeding: {
            brand: feedingBrand,
            breakfast: { time: breakfastTime, amount: breakfastAmount },
            lunch: { time: lunchTime, amount: lunchAmount },
            dinner: { time: dinnerTime, amount: dinnerAmount },
            treats: { type: treatsType, limit: treatsLimit },
            notes: feedingNotes,
          },
          walks,
          sleep,
          bathroom_habits: bathroom,
          left_alone: { ok: leftAloneOk, detail: leftAloneDetail },
          toileting_frequency: toileting,
        }, { onConflict: "pet_id" }),
        supabase.from("pet_medical").upsert({
          pet_id: petId,
          allergies: allergies ? allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
          conditions: conditions ? conditions.split(",").map((s) => s.trim()).filter(Boolean) : [],
          medications: meds
            .filter((m) => m.name.trim())
            .map((m) => ({ name: m.name.trim(), dose: m.dose.trim(), frequency: "", time_of_day: "", location_stored: "", notes: "", with_meal: m.withMeal ?? null })),
        }, { onConflict: "pet_id" }),
      ]);
      router.back();
    } catch (e: any) {
      AppAlert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  const petName = pet?.name ?? "your pet";

  const PaidBadge = () =>
    !isPaid ? (
      <TouchableOpacity onPress={() => router.push("/upgrade")} style={{ marginLeft: 8 }}>
        <FieldTier />
      </TouchableOpacity>
    ) : null;

  return (
    <EditShell title="Routine & Medical" onSave={save} saving={saving} loading={loading} scrollRef={scrollRef}>
      {!isPaid && (
        <View style={{ marginBottom: 16 }}>
          <InlineNote variant="paywall" cta={`Unlock for ${PRICE}`} onCta={() => router.push("/upgrade")}>
            Feeding shows on every link. The rest of the routine stays saved until you unlock.
          </InlineNote>
        </View>
      )}

      {/* Routine section title */}
      <Text style={{ fontFamily: "Tanker", fontSize: 24, lineHeight: 28, color: colors.textDark, marginBottom: 12 }}>Routine</Text>

      {/* Feeding — meal blocks on blush, matching the prototype */}
      <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow ochre>Feeding</Eyebrow>
        </View>
        <RoutineMeal label="Breakfast" time={breakfastTime} amount={breakfastAmount} onTime={setBreakfastTime} onAmount={setBreakfastAmount} divider />
        <RoutineMeal label="Lunch" time={lunchTime} amount={lunchAmount} onTime={setLunchTime} onAmount={setLunchAmount} divider />
        <RoutineMeal label="Dinner" time={dinnerTime} amount={dinnerAmount} onTime={setDinnerTime} onAmount={setDinnerAmount} divider defaultPeriod="PM" />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 12, fontFamily: "Satoshi-Bold", color: colors.textDark }}>Treats</Text>
          <TextInput style={mealInput} placeholder="Type / brand" placeholderTextColor={colors.textMuted} autoCapitalize="sentences" value={treatsType} onChangeText={(v) => setTreatsType(capitalizeFirst(v))} />
          <TextInput style={mealInput} placeholder="Daily limit — e.g. max 3 per day" placeholderTextColor={colors.textMuted} autoCapitalize="sentences" value={treatsLimit} onChangeText={(v) => setTreatsLimit(capitalizeFirst(v))} />
        </View>
        <TextInput
          style={{ paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, fontFamily: "Satoshi", color: colors.textMuted }}
          placeholder="Notes — slow feeder, timing, anything else…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="sentences"
          value={feedingNotes}
          onChangeText={(v) => setFeedingNotes(capitalizeFirst(v))}
        />
      </View>

      {/* Walks */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>Walks</Eyebrow>
          <PaidBadge />
        </View>
        <Input
          className="mt-2"
          placeholder="45 min morning, 20 min evening. She needs to sniff properly."
          value={walks}
          onChangeText={setWalks}
          multiline
          style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Sleep */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>Sleep</Eyebrow>
          <PaidBadge />
        </View>
        <Input
          className="mt-2"
          placeholder="Dog bed in the bedroom, door stays open. Do not crate."
          value={sleep}
          onChangeText={setSleep}
          multiline
          style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Bathroom */}
      <Card style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>Bathroom habits</Eyebrow>
          <PaidBadge />
        </View>
        <Input
          className="mt-2"
          placeholder="3× daily, signals by sitting by the back door"
          value={bathroom}
          onChangeText={setBathroom}
          multiline
          style={{ height: 72, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Toileting frequency — directly under bathroom habits */}
      <Card style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>How often do they toilet?</Eyebrow>
          <PaidBadge />
        </View>
        <Input
          className="mt-2"
          placeholder="e.g. Every 4–6 hours, and after meals"
          value={toileting}
          onChangeText={(v) => setToileting(capitalizeFirst(v))}
        />
      </Card>

      {/* Can they be left alone? */}
      <Card style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>Can they be left alone?</Eyebrow>
          <PaidBadge />
        </View>
        <View style={{ marginTop: 8 }}>
          <Select value={leftAloneOk} onValueChange={setLeftAloneOk} options={["Yes", "No"]} placeholder="Select" />
        </View>
        <Input
          className="mt-2"
          placeholder="e.g. Up to 4 hours, crated with a chew"
          value={leftAloneDetail}
          onChangeText={(v) => setLeftAloneDetail(capitalizeFirst(v))}
          multiline
          style={{ height: 64, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Medical section title */}
      <Text
        onLayout={(e) => { medicalY.current = e.nativeEvent.layout.y; }}
        style={{ fontFamily: "Tanker", fontSize: 24, lineHeight: 28, color: colors.textDark, marginTop: 8, marginBottom: 12 }}
      >
        Medical
      </Text>

      {/* Allergies — always visible, free */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>Allergies</Eyebrow>
        </View>
        <Input
          className="mt-2"
          placeholder="Chicken-based kibble causes skin itching"
          value={allergies}
          onChangeText={setAllergies}
          multiline
          style={{ height: 60, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Conditions */}
      <Card style={{ marginBottom: 12 }}>
        <Eyebrow>Medical conditions</Eyebrow>
        <Input
          className="mt-2"
          placeholder="Atopic dermatitis, managed with Apoquel"
          value={conditions}
          onChangeText={setConditions}
          multiline
          style={{ height: 60, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Medications — structured entries, each tied to a meal (#94) */}
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
    </EditShell>
  );
}
