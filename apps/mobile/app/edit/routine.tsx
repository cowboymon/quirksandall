// Edit routine + medical. Tier-aware: shows lock indicator on paid-gated sections for free users.
import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { AppAlert } from "../../stores/appAlert";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card, InlineNote, TimeInput, FieldTier, Select } from "../../components/ui";
import { Trash } from "../../components/icons";
import MedicationsEditor, { medsToRows, rowsToMeds, type EditableMedication } from "../../components/MedicationsEditor";
import { colors, capitalizeFirst, isUnlocked, treatEntries } from "@quirksandall/shared";
import type { TreatEntry, Condition } from "@quirksandall/shared";
import { usePrices } from "../../hooks/usePrices";

const mealInput = {
  minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8,
  fontSize: 14, fontFamily: "Satoshi", color: colors.textDark,
} as const;

function RoutineMeal({ label, time, amount, onTime, onAmount, divider, defaultPeriod, skipped, onToggleSkip, quickFill, onQuickFill }: {
  label: string; time: string; amount: string;
  onTime: (v: string) => void; onAmount: (v: string) => void; divider: boolean; defaultPeriod?: "AM" | "PM";
  // #23 — the pet deliberately doesn't have this meal. Renders to sitters as
  // an intentional skip instead of looking like missing data.
  skipped: boolean; onToggleSkip: () => void;
  // #21 — offered on later meals while they're empty and breakfast isn't.
  quickFill?: string; onQuickFill?: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, fontFamily: "Satoshi-Bold", color: colors.textDark }}>{label}</Text>
        <TouchableOpacity onPress={onToggleSkip} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} activeOpacity={0.8}>
          <Text style={{ fontSize: 11, fontFamily: "Satoshi-Medium", color: skipped ? colors.primary : colors.textMuted }}>
            {skipped ? `No ${label.toLowerCase()} ✓` : `No ${label.toLowerCase()}?`}
          </Text>
        </TouchableOpacity>
      </View>
      {skipped ? (
        <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: "Satoshi-Light" }}>
          Marked as not having this meal — shown to sitters as skipped on purpose.
        </Text>
      ) : (
        <>
          <TimeInput style={mealInput} placeholder="7:30" value={time} onChangeText={onTime} defaultPeriod={defaultPeriod} />
          <TextInput style={mealInput} placeholder="Amount & brand" placeholderTextColor={colors.textMuted} autoCapitalize="sentences" clearButtonMode="while-editing" value={amount} onChangeText={(v) => onAmount(capitalizeFirst(v))} />
          {quickFill && onQuickFill && !amount ? (
            <TouchableOpacity onPress={onQuickFill} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Satoshi-Medium" }}>{quickFill}</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}

export default function EditRoutine() {
  const prices = usePrices();
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
  const [breakfastSkip, setBreakfastSkip] = useState(false);
  const [lunchSkip, setLunchSkip] = useState(false);
  const [dinnerSkip, setDinnerSkip] = useState(false);
  const [treats, setTreats] = useState<TreatEntry[]>([{ type: "", limit: "" }]);
  // #24 — "+ Add another treat" should hand the keyboard straight to the new
  // row instead of leaving focus sitting on whatever was tapped last, so the
  // new line the user just created is the one they land in, not the one
  // above it.
  const treatTypeRefs = useRef<Array<TextInput | null>>([]);
  const focusNextTreatIndex = useRef<number | null>(null);
  useEffect(() => {
    if (focusNextTreatIndex.current == null) return;
    treatTypeRefs.current[focusNextTreatIndex.current]?.focus();
    focusNextTreatIndex.current = null;
  }, [treats.length]);
  const [feedingNotes, setFeedingNotes] = useState("");
  const [walks, setWalks] = useState("");
  const [sleep, setSleep] = useState("");
  const [bathroom, setBathroom] = useState("");
  const [leftAloneOk, setLeftAloneOk] = useState("");
  const [leftAloneDetail, setLeftAloneDetail] = useState("");
  const [toileting, setToileting] = useState("");

  // Medical — one line per allergy (#94 follow-up) rather than a single
  // comma-blob field, so multiple entries don't run together in one
  // paragraph. Conditions carry a name + meaning pair, same split as
  // Commands, rather than one free-text line.
  const [allergies, setAllergies] = useState<string[]>([""]);
  const [conditions, setConditions] = useState<Condition[]>([{ name: "", meaning: "" }]);
  const [meds, setMeds] = useState<EditableMedication[]>([]);

  const [isPaid, setIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
      const [{ data: owner }, { data: routine }, { data: medical }] = await Promise.all([
        supabase.from("owners").select("purchase_status, expires_at").eq("id", user!.id).single(),
        supabase.from("pet_routine").select("*").eq("pet_id", petId).single(),
        supabase.from("pet_medical").select("*").eq("pet_id", petId).single(),
      ]);

      setIsPaid(isUnlocked(owner));

      if (routine) {
        const f = routine.feeding ?? {};
        setFeedingBrand(f.brand ?? "");
        setBreakfastTime(f.breakfast?.time ?? "");
        setBreakfastAmount(f.breakfast?.amount ?? "");
        setLunchTime(f.lunch?.time ?? "");
        setLunchAmount(f.lunch?.amount ?? "");
        setDinnerTime(f.dinner?.time ?? "");
        setDinnerAmount(f.dinner?.amount ?? "");
        setBreakfastSkip(!!f.breakfast?.skip);
        setLunchSkip(!!f.lunch?.skip);
        setDinnerSkip(!!f.dinner?.skip);
        const loadedTreats = treatEntries(f.treats);
        setTreats(loadedTreats.length ? loadedTreats : [{ type: "", limit: "" }]);
        setFeedingNotes(f.notes ?? "");
        setWalks(routine.walks ?? "");
        setSleep(routine.sleep ?? "");
        setBathroom(routine.bathroom_habits ?? "");
        setLeftAloneOk(routine.left_alone?.ok ?? "");
        setLeftAloneDetail(routine.left_alone?.detail ?? "");
        setToileting(routine.toileting_frequency ?? "");
      }

      if (medical) {
        setAllergies((medical.allergies ?? []).length ? medical.allergies : [""]);
        // Legacy rows (pre name/meaning split) stored a bare string per
        // condition — fold it into { name, meaning: "" } rather than lose it.
        const rawConditions: any[] = medical.conditions ?? [];
        setConditions(
          rawConditions.length
            ? rawConditions.map((c) => (typeof c === "string" ? { name: c, meaning: "" } : { name: c.name ?? "", meaning: c.meaning ?? "" }))
            : [{ name: "", meaning: "" }]
        );
        setMeds(rowsToMeds(medical.medications ?? []));
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
            // A skipped meal keeps its typed values in case the skip is
            // toggled back off, but renderers ignore them while skip is set.
            breakfast: { time: breakfastTime, amount: breakfastAmount, skip: breakfastSkip || undefined },
            lunch: { time: lunchTime, amount: lunchAmount, skip: lunchSkip || undefined },
            dinner: { time: dinnerTime, amount: dinnerAmount, skip: dinnerSkip || undefined },
            // Always saved as an array (#24); treatEntries() normalises the
            // legacy single-object shape on read.
            treats: treatEntries(treats),
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
          allergies: allergies.map((s) => s.trim()).filter(Boolean),
          conditions: conditions
            .map((c) => ({ name: c.name.trim(), meaning: c.meaning.trim() }))
            .filter((c) => c.name || c.meaning),
          medications: medsToRows(meds),
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
          <InlineNote variant="paywall" cta={`Unlock for ${prices.annual}/yr`} onCta={() => router.push("/upgrade")}>
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
        <RoutineMeal label="Breakfast" time={breakfastTime} amount={breakfastAmount} onTime={setBreakfastTime} onAmount={setBreakfastAmount} divider skipped={breakfastSkip} onToggleSkip={() => setBreakfastSkip((v) => !v)} />
        <RoutineMeal label="Lunch" time={lunchTime} amount={lunchAmount} onTime={setLunchTime} onAmount={setLunchAmount} divider skipped={lunchSkip} onToggleSkip={() => setLunchSkip((v) => !v)}
          quickFill={breakfastAmount && !breakfastSkip ? "Same as breakfast" : undefined} onQuickFill={() => setLunchAmount(breakfastAmount)} />
        <RoutineMeal label="Dinner" time={dinnerTime} amount={dinnerAmount} onTime={setDinnerTime} onAmount={setDinnerAmount} divider defaultPeriod="PM" skipped={dinnerSkip} onToggleSkip={() => setDinnerSkip((v) => !v)}
          quickFill={breakfastAmount && !breakfastSkip ? "Same as breakfast" : undefined} onQuickFill={() => setDinnerAmount(breakfastAmount)} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 12, fontFamily: "Satoshi-Bold", color: colors.textDark }}>Treats</Text>
          {treats.map((t, i) => (
            <View key={i} style={{ gap: 8 }}>
              {treats.length > 1 && (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: i === 0 ? 0 : 4 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.textMuted }}>Treat {i + 1}</Text>
                  <TouchableOpacity onPress={() => setTreats((prev) => prev.filter((_, j) => j !== i))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Trash size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              )}
              <TextInput ref={(r) => { treatTypeRefs.current[i] = r; }} style={mealInput} placeholder="Type / brand" placeholderTextColor={colors.textMuted} autoCapitalize="sentences" clearButtonMode="while-editing" value={t.type}
                onChangeText={(v) => setTreats((prev) => prev.map((x, j) => (j === i ? { ...x, type: capitalizeFirst(v) } : x)))} />
              <TextInput style={mealInput} placeholder="Daily limit — e.g. max 3 per day" placeholderTextColor={colors.textMuted} autoCapitalize="sentences" clearButtonMode="while-editing" value={t.limit}
                onChangeText={(v) => setTreats((prev) => prev.map((x, j) => (j === i ? { ...x, limit: capitalizeFirst(v) } : x)))} />
            </View>
          ))}
          <TouchableOpacity onPress={() => {
            focusNextTreatIndex.current = treats.length;
            setTreats((prev) => [...prev, { type: "", limit: "" }]);
          }} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Satoshi-Medium" }}>+ Add another treat</Text>
          </TouchableOpacity>
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

      {/* Medications sit right after Feeding, not down in Medical — a
          medication is almost always tagged to a meal slot, so the input
          it needs (which meal) is right above it. Medical below still
          carries the section title/scroll-anchor for Allergies/Conditions,
          which aren't feeding-related. MedicationsEditor carries its own
          "Medications" heading, so it doesn't rely on Medical's title for
          context. */}
      <View style={{ marginBottom: 12 }}>
        <MedicationsEditor meds={meds} onChange={setMeds} />
      </View>

      {/* Daily Routine — groups walks/sleep/bathroom/toileting/left alone,
          mirroring the same heading on the recipient link. Same Tanker
          treatment as Routine/Medical above, not a small uppercase label. */}
      <Text style={{ fontFamily: "Tanker", fontSize: 24, lineHeight: 28, color: colors.textDark, marginTop: 8, marginBottom: 12 }}>
        Daily Routine
      </Text>

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
          style={{ minHeight: 72, paddingTop: 10, textAlignVertical: "top" }}
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
          style={{ minHeight: 72, paddingTop: 10, textAlignVertical: "top" }}
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
          style={{ minHeight: 72, paddingTop: 10, textAlignVertical: "top" }}
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
          style={{ minHeight: 64, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Medical section title */}
      <Text
        onLayout={(e) => { medicalY.current = e.nativeEvent.layout.y; }}
        style={{ fontFamily: "Tanker", fontSize: 24, lineHeight: 28, color: colors.textDark, marginTop: 8, marginBottom: 12 }}
      >
        Medical
      </Text>

      {/* Conditions — name + what it means for the sitter, same split as
          Commands, rather than one free-text line. */}
      <Card style={{ marginBottom: 12 }}>
        <Eyebrow>Medical conditions</Eyebrow>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
          Add each one, and what it means for the sitter.
        </Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          {conditions.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Input
                  placeholder="Condition — e.g. Phantom pregnancy"
                  value={c.name}
                  onChangeText={(v) => setConditions((prev) => prev.map((x, j) => (j === i ? { ...x, name: v } : x)))}
                />
                <Input
                  placeholder="What it means for the sitter"
                  value={c.meaning}
                  onChangeText={(v) => setConditions((prev) => prev.map((x, j) => (j === i ? { ...x, meaning: v } : x)))}
                  multiline
                />
              </View>
              {conditions.length > 1 && (
                <TouchableOpacity onPress={() => setConditions((prev) => prev.filter((_, j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingTop: 14 }}>
                  <Trash size={16} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={() => setConditions((prev) => [...prev, { name: "", meaning: "" }])} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Satoshi-Medium" }}>+ Add another condition</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Allergies — always visible, free. One line per allergy, rather
          than a single comma-run-together paragraph. */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>Allergies</Eyebrow>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
          Add each one — food, environmental, medication.
        </Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          {allergies.map((a, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              {/* multiline so a longer entry grows the field to fit instead
                  of scrolling out of view; starts single-line height. */}
              <Input
                style={{ flex: 1 }}
                placeholder="Chicken-based kibble causes skin itching"
                value={a}
                onChangeText={(v) => setAllergies((prev) => prev.map((x, j) => (j === i ? v : x)))}
                multiline
              />
              {allergies.length > 1 && (
                <TouchableOpacity onPress={() => setAllergies((prev) => prev.filter((_, j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingTop: 14 }}>
                  <Trash size={16} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={() => setAllergies((prev) => [...prev, ""])} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Satoshi-Medium" }}>+ Add another allergy</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </EditShell>
  );
}
