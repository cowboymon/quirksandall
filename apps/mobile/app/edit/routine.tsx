// Edit routine + medical. Tier-aware: shows lock indicator on paid-gated sections for free users.
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useActivePet } from "../../hooks/useActivePet";
import EditShell from "../../components/EditShell";
import { Input, Eyebrow, Card } from "../../components/ui";
import { colors } from "@quirksandall/shared";

export default function EditRoutine() {
  const { petId, pet, loading } = useActivePet();

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

  // Medical
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");

  const [isPaid, setIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      }

      if (medical) {
        setAllergies((medical.allergies ?? []).join(", "));
        setConditions((medical.conditions ?? []).join(", "));
        setMedications(
          (medical.medications ?? []).map((m: any) => `${m.name} ${m.dose}`).join("; ")
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
        }),
        supabase.from("pet_medical").upsert({
          pet_id: petId,
          allergies: allergies ? allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
          conditions: conditions ? conditions.split(",").map((s) => s.trim()).filter(Boolean) : [],
          medications: medications
            ? [{ name: medications, dose: "", frequency: "", time_of_day: "", location_stored: "", notes: "" }]
            : [],
        }),
      ]);
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  const petName = pet?.name ?? "your pet";

  const PaidBadge = () =>
    !isPaid ? (
      <TouchableOpacity onPress={() => router.push("/upgrade")} style={{ marginLeft: 8 }}>
        <Text style={{ fontSize: 11, color: colors.caution, fontWeight: "600" }}>🔒 Paid</Text>
      </TouchableOpacity>
    ) : null;

  return (
    <EditShell title="Routine & medical" onSave={save} saving={saving} loading={loading}>
      {!isPaid && (
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 10,
            borderLeftWidth: 3,
            borderLeftColor: colors.caution,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
            Routine's saved. Sitters won't see it until you unlock.{" "}
            <Text
              style={{ color: colors.accent, fontWeight: "600" }}
              onPress={() => router.push("/upgrade")}
            >
              Unlock for $7.99 →
            </Text>
          </Text>
        </View>
      )}

      {/* Feeding */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Eyebrow>Feeding</Eyebrow>
          <PaidBadge />
        </View>
        <Input className="mt-2" placeholder="Food brand" value={feedingBrand} onChangeText={setFeedingBrand} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Input style={{ flex: 1 }} placeholder="Breakfast time" value={breakfastTime} onChangeText={setBreakfastTime} />
          <Input style={{ flex: 1 }} placeholder="Amount" value={breakfastAmount} onChangeText={setBreakfastAmount} />
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Input style={{ flex: 1 }} placeholder="Lunch time (optional)" value={lunchTime} onChangeText={setLunchTime} />
          <Input style={{ flex: 1 }} placeholder="Amount" value={lunchAmount} onChangeText={setLunchAmount} />
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Input style={{ flex: 1 }} placeholder="Dinner time" value={dinnerTime} onChangeText={setDinnerTime} />
          <Input style={{ flex: 1 }} placeholder="Amount" value={dinnerAmount} onChangeText={setDinnerAmount} />
        </View>
        <Input className="mt-2" placeholder="Treats (type, e.g. Zuke's Mini Naturals)" value={treatsType} onChangeText={setTreatsType} />
        <Input className="mt-2" placeholder="Treat limit" value={treatsLimit} onChangeText={setTreatsLimit} />
        <Input
          className="mt-2"
          placeholder="Notes (e.g. slow feeder bowl only)"
          value={feedingNotes}
          onChangeText={setFeedingNotes}
          multiline
          style={{ height: 60, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Walks */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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

      {/* Allergies — always visible, free */}
      <Card style={{ marginBottom: 12, borderColor: colors.success }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>Allergies</Eyebrow>
          <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600" }}>Always shown</Text>
        </View>
        <Input
          className="mt-2"
          placeholder="Chicken-based kibble causes skin itching"
          value={allergies}
          onChangeText={setAllergies}
          multiline
          style={{ height: 60, paddingTop: 10, textAlignVertical: "top" }}
        />
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
          Comma-separate multiple allergies. Safety override — visible to all recipients regardless of tier.
        </Text>
      </Card>

      {/* Conditions — paid only */}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Eyebrow>Medical conditions</Eyebrow>
          <PaidBadge />
        </View>
        <Input
          className="mt-2"
          placeholder="Atopic dermatitis, managed with Apoquel"
          value={conditions}
          onChangeText={setConditions}
          multiline
          style={{ height: 60, paddingTop: 10, textAlignVertical: "top" }}
        />
      </Card>

      {/* Medications — paid only */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Eyebrow>Medications</Eyebrow>
          <PaidBadge />
        </View>
        <Input
          className="mt-2"
          placeholder="Apoquel 16mg with breakfast. Pill pockets. Kitchen cupboard above microwave."
          value={medications}
          onChangeText={setMedications}
          multiline
          style={{ height: 88, paddingTop: 10, textAlignVertical: "top" }}
        />
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
          Include name, dose, frequency, and where it's stored.
        </Text>
      </Card>
    </EditShell>
  );
}
