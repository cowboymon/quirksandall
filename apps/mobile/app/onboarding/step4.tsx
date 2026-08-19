// Screen 4 — Routine & medical
import { View, Text, TextInput, TouchableOpacity, Platform } from "react-native";
import { AppAlert } from "../../stores/appAlert";
import { router } from "expo-router";
import { track, AnalyticsEvent } from "../../lib/analytics";
import { Headline, Textarea, Input, InlineNote, PrimaryButton, SkipButton, Eyebrow, TimeInput, Select } from "../../components/ui";
import { Trash } from "../../components/icons";
import OnboardingShell from "../../components/OnboardingShell";
import { Underlined } from "../../components/Underlined";
import MedicationsEditor, { medsToRows } from "../../components/MedicationsEditor";
import { useOnboardingStore } from "../../stores/onboarding";
import { useActivePetStore } from "../../stores/activePet";
import { supabase } from "../../lib/supabase";
import { uploadPetPhoto } from "../../lib/uploadPhoto";
import { randomToken } from "../../lib/links";
import { rememberPin } from "../../lib/pinVault";
import { colors, displayDateToISO, capitalizeFirst, isUnlocked, treatEntries } from "@quirksandall/shared";
import { usePrices } from "../../hooks/usePrices";
import { useState, useEffect, useRef } from "react";

const mealInput = {
  minHeight: 38,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background, // blush #F8ECEE
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 14,
  fontFamily: "Satoshi",
  color: colors.textDark,
} as const;

// Mirrors RoutineMeal in app/edit/routine.tsx — keep the two in step.
function MealBlock({ label, time, amount, onTime, onAmount, divider, defaultPeriod, skipped, onToggleSkip, quickFill, onQuickFill }: {
  label: string; time: string; amount: string;
  onTime: (v: string) => void; onAmount: (v: string) => void; divider: boolean; defaultPeriod?: "AM" | "PM";
  skipped: boolean; onToggleSkip: () => void;
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

export default function Step4() {
  const prices = usePrices();
  const { pet, setPet, reset } = useOnboardingStore();
  const [saving, setSaving] = useState(false);
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
  }, [pet.feedingTreats?.length]);
  // The unlock is account-wide, so a paid owner adding another pet should never
  // see the paywall again (#86). Check their entitlement up front.
  const [isPaid, setIsPaid] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("owners").select("purchase_status, expires_at").eq("id", user.id).single();
      if (isUnlocked(data)) setIsPaid(true);
    })();
  }, []);

  const finish = async () => {
    // Both "Finish" and "Skip" call this — guard so a double-tap can't create
    // the pet twice.
    if (saving) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      await supabase.from("owners").upsert({ id: user.id, primary_email: user.email }).select("id").single();

      const { data: newPet } = await supabase
        .from("pets")
        .insert({
          owner_id: user.id, name: pet.name, breed: pet.breed, species: pet.species || "dog",
          dob: displayDateToISO(pet.dob) ?? new Date().toISOString().slice(0, 10), dob_is_estimated: pet.dobIsEstimated ?? false,
          sex: pet.sex, weight: pet.weight, color_markings: pet.colorMarkings, microchip_number: pet.microchipNumber, photo_url: null,
        })
        .select("id").single();
      if (!newPet) throw new Error("Failed to create pet");
      track(AnalyticsEvent.PetCreated, { platform: Platform.OS });

      if (pet.photoUri?.startsWith("file://")) {
        const photoUrl = await uploadPetPhoto(newPet.id, pet.photoUri);
        await supabase.from("pets").update({ photo_url: photoUrl }).eq("id", newPet.id);
      }

      const backups = [];
      if (pet.backupName) backups.push({ name: pet.backupName, relationship: pet.backupRelationship, phone: pet.backupPhone, consent_to_share: pet.backupConsent ?? false, is_decision_contact: pet.backupIsDecisionContact ?? false });
      if (pet.backup2Name) backups.push({ name: pet.backup2Name, relationship: pet.backup2Relationship ?? "", phone: pet.backup2Phone, consent_to_share: pet.backup2Consent ?? false, is_decision_contact: pet.backup2IsDecisionContact ?? false });
      // Priority follows entry order among only the contacts actually marked
      // as a decision contact (1 = call first).
      let priority = 1;
      for (const b of backups) {
        if (b.is_decision_contact) (b as any).decision_priority = priority++;
      }

      // These writes touch independent tables/rows, so run them concurrently
      // instead of paying for each round trip serially.
      await Promise.all([
        supabase.from("pet_vet_info").insert({
          pet_id: newPet.id,
          primary_vet: { contact_name: pet.vetContactName, clinic: pet.vetClinic, address: pet.vetAddress, phone: pet.vetPhone },
          emergency_vet: { clinic: pet.emergVetClinic, address: pet.emergVetAddress, phone: pet.emergVetPhone },
          insurance: { provider: pet.insuranceProvider, policy_number: pet.insurancePolicy },
        }),
        backups.length ? supabase.from("owners").update({ backup_contacts: backups }).eq("id", user.id) : Promise.resolve(),
        supabase.from("pet_behavior").insert({
          pet_id: newPet.id, commands: pet.commands ?? [], scared: pet.scared, no_go: pet.noGo, flight_risk: pet.flightRisk,
          escape_risk: { flag: !!pet.flightRisk, notes: pet.flightRisk }, quirks_triggers: [], temperament_summary: pet.temperament,
        }),
        supabase.from("pet_medical").insert({
          pet_id: newPet.id,
          allergies: (pet.allergies ?? []).map((s) => s.trim()).filter(Boolean),
          conditions: (pet.conditions ?? [])
            .map((c) => ({ name: c.name.trim(), meaning: c.meaning.trim() }))
            .filter((c) => c.name || c.meaning),
          medications: medsToRows(pet.medications ?? []),
        }),
        supabase.from("pet_routine").insert({
          pet_id: newPet.id,
          feeding: {
            breakfast: { time: pet.feedingBreakfastTime, amount: pet.feedingBreakfastAmount, skip: pet.feedingBreakfastSkip || undefined },
            lunch: { time: pet.feedingLunchTime, amount: pet.feedingLunchAmount, skip: pet.feedingLunchSkip || undefined },
            dinner: { time: pet.feedingDinnerTime, amount: pet.feedingDinnerAmount, skip: pet.feedingDinnerSkip || undefined },
            treats: treatEntries(pet.feedingTreats),
            notes: pet.feedingNotes,
          },
          walks: pet.walks, sleep: pet.sleep, bathroom_habits: pet.bathroomHabits,
          left_alone: { ok: pet.leftAloneOk, detail: pet.leftAloneDetail },
          toileting_frequency: pet.toileting,
        }),
      ]);

      // Crypto-random token (same source as every other link) — never
      // Math.random(), which is predictable and would make the main link
      // guessable.
      const token = randomToken();
      const { data: newLink } = await supabase
        .from("share_links")
        .insert({ pet_id: newPet.id, token, label: "Main link", pin_hash: null, mode: "full", revoked: false })
        .select("id")
        .single();
      // Value Moment — onboarding leaves the pet with a shareable link ready.
      track(AnalyticsEvent.ShareLinkCreated, { context: "onboarding", platform: Platform.OS });

      // Persist the PIN the owner chose during onboarding. Hashing happens
      // server-side in the set-pin edge function so we never store it plaintext.
      if (newLink?.id && pet.pin && /^\d{4}$/.test(pet.pin)) {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/set-pin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ link_id: newLink.id, pin: pet.pin }),
        }).catch(() => {});
        // Keep a device-local copy so the share flow can offer to send it —
        // the server only ever holds the bcrypt hash.
        await rememberPin(newPet.id, pet.pin);
      }

      // Make the pet we just created the active one, so the dashboard lands on
      // it instead of an earlier/stale selection (or bouncing to onboarding).
      useActivePetStore.getState().setPetId(newPet.id);
      reset();
      router.replace("/dashboard");
    } catch (e: any) {
      AppAlert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step={4}>
      <View style={{ marginBottom: 6 }}><Eyebrow>Step 4 of 4</Eyebrow></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" }}>
        <Headline>A normal day </Headline>
        <Underlined><Headline>for {pet.name ?? "them"}.</Headline></Underlined>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, fontFamily: "Satoshi-Light" }}>
        Your link already works. This is the full picture.
      </Text>
      {/* Paywall only for free owners — paid access is account-wide (#86). */}
      {!isPaid && (
        <View style={{ marginTop: 12 }}>
          <InlineNote variant="paywall" cta={`Unlock for ${prices.annual}/yr`} onCta={() => router.push("/upgrade")}>
            Routine's saved. Sitters won't see it until you unlock.
          </InlineNote>
        </View>
      )}

      {/* Routine */}
      <View style={{ marginTop: 24 }}>
        <Eyebrow ochre>Routine</Eyebrow>
        <View style={{ marginTop: 12, gap: 12 }}>
          {/* Feeding card */}
          <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Eyebrow ochre>Feeding</Eyebrow>
            </View>
            <MealBlock label="Breakfast" time={pet.feedingBreakfastTime ?? ""} amount={pet.feedingBreakfastAmount ?? ""} onTime={(v) => setPet({ feedingBreakfastTime: v })} onAmount={(v) => setPet({ feedingBreakfastAmount: v })} divider
              skipped={!!pet.feedingBreakfastSkip} onToggleSkip={() => setPet({ feedingBreakfastSkip: !pet.feedingBreakfastSkip })} />
            <MealBlock label="Lunch" time={pet.feedingLunchTime ?? ""} amount={pet.feedingLunchAmount ?? ""} onTime={(v) => setPet({ feedingLunchTime: v })} onAmount={(v) => setPet({ feedingLunchAmount: v })} divider
              skipped={!!pet.feedingLunchSkip} onToggleSkip={() => setPet({ feedingLunchSkip: !pet.feedingLunchSkip })}
              quickFill={pet.feedingBreakfastAmount && !pet.feedingBreakfastSkip ? "Same as breakfast" : undefined} onQuickFill={() => setPet({ feedingLunchAmount: pet.feedingBreakfastAmount })} />
            <MealBlock label="Dinner" time={pet.feedingDinnerTime ?? ""} amount={pet.feedingDinnerAmount ?? ""} onTime={(v) => setPet({ feedingDinnerTime: v })} onAmount={(v) => setPet({ feedingDinnerAmount: v })} divider defaultPeriod="PM"
              skipped={!!pet.feedingDinnerSkip} onToggleSkip={() => setPet({ feedingDinnerSkip: !pet.feedingDinnerSkip })}
              quickFill={pet.feedingBreakfastAmount && !pet.feedingBreakfastSkip ? "Same as breakfast" : undefined} onQuickFill={() => setPet({ feedingDinnerAmount: pet.feedingBreakfastAmount })} />
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 12, fontFamily: "Satoshi-Bold", color: colors.textDark }}>Treats</Text>
              {(pet.feedingTreats ?? [{ type: "", limit: "" }]).map((t, i) => {
                const list = pet.feedingTreats ?? [{ type: "", limit: "" }];
                return (
                  <View key={i} style={{ gap: 8 }}>
                    {list.length > 1 && (
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: i === 0 ? 0 : 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.textMuted }}>Treat {i + 1}</Text>
                        <TouchableOpacity onPress={() => setPet({ feedingTreats: list.filter((_, j) => j !== i) })} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <Trash size={15} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <TextInput ref={(r) => { treatTypeRefs.current[i] = r; }} style={mealInput} placeholder="Type / brand" placeholderTextColor={colors.textMuted} autoCapitalize="sentences" clearButtonMode="while-editing" value={t.type}
                      onChangeText={(v) => setPet({ feedingTreats: list.map((x, j) => (j === i ? { ...x, type: capitalizeFirst(v) } : x)) })} />
                    <TextInput style={mealInput} placeholder="Daily limit — e.g. max 3 per day" placeholderTextColor={colors.textMuted} autoCapitalize="sentences" clearButtonMode="while-editing" value={t.limit}
                      onChangeText={(v) => setPet({ feedingTreats: list.map((x, j) => (j === i ? { ...x, limit: capitalizeFirst(v) } : x)) })} />
                  </View>
                );
              })}
              <TouchableOpacity onPress={() => {
                const list = pet.feedingTreats ?? [{ type: "", limit: "" }];
                focusNextTreatIndex.current = list.length;
                setPet({ feedingTreats: [...list, { type: "", limit: "" }] });
              }} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Satoshi-Medium" }}>+ Add another treat</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={{ paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, fontFamily: "Satoshi", color: colors.textMuted }}
              placeholder="Notes — slow feeder, timing, anything else…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="sentences"
              value={pet.feedingNotes ?? ""}
              onChangeText={(v) => setPet({ feedingNotes: capitalizeFirst(v) })}
            />
          </View>

          {/* Medications sit right after Feeding, not down in Medical — a
              medication is almost always tagged to a meal slot, so the
              input it needs (which meal) is right above it. Medical below
              still holds Allergies, which isn't feeding-related.
              MedicationsEditor carries its own "Medications" heading, so
              it doesn't rely on Medical's title for context. */}
          <MedicationsEditor meds={pet.medications ?? []} onChange={(meds) => setPet({ medications: meds })} />

          {/* Daily Routine — groups walks/sleep/bathroom/toileting/left
              alone, mirroring the same heading on the recipient link. */}
          <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.textMuted, marginTop: 4 }}>
            Daily Routine
          </Text>

          <View>
            <Eyebrow>Walks</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="Frequency, duration, any notes…" value={pet.walks ?? ""} onChangeText={(v) => setPet({ walks: v })} />
          </View>
          <View>
            <Eyebrow>Sleep setup</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="Crate, bed location, door open/closed…" value={pet.sleep ?? ""} onChangeText={(v) => setPet({ sleep: v })} />
          </View>
          <View>
            <Eyebrow>Bathroom habits</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="3× daily, signals by sitting by the back door" value={pet.bathroomHabits ?? ""} onChangeText={(v) => setPet({ bathroomHabits: v })} />
          </View>
          <View>
            <Eyebrow>How often do they toilet?</Eyebrow>
            <Textarea style={{ marginTop: 4 }} placeholder="e.g. Every 4–6 hours, and after meals" value={pet.toileting ?? ""} onChangeText={(v) => setPet({ toileting: v })} />
          </View>
          <View>
            <Eyebrow>Can they be left alone?</Eyebrow>
            <View style={{ marginTop: 4 }}>
              <Select value={pet.leftAloneOk ?? ""} onValueChange={(v) => setPet({ leftAloneOk: v })} options={["Yes", "No"]} placeholder="Select" />
            </View>
            <Textarea style={{ marginTop: 8 }} placeholder="e.g. Up to 4 hours, crated with a chew" value={pet.leftAloneDetail ?? ""} onChangeText={(v) => setPet({ leftAloneDetail: v })} />
          </View>
        </View>
      </View>

      {/* Medical */}
      <View style={{ marginTop: 24 }}>
        <Eyebrow ochre>Medical</Eyebrow>
        <View style={{ marginTop: 12, gap: 12 }}>
          {/* Medical conditions — name + what it means for the sitter, same
              split as Commands, rather than one free-text line. Previously
              had no onboarding input at all; only editable later from the
              dashboard's Edit → Routine & Medical screen. */}
          <View>
            <Eyebrow>Medical conditions</Eyebrow>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, marginBottom: 2 }}>
              Add each one, and what it means for the sitter.
            </Text>
            <View style={{ gap: 8, marginTop: 4 }}>
              {(pet.conditions ?? [{ name: "", meaning: "" }]).map((c, i) => {
                const list = pet.conditions ?? [{ name: "", meaning: "" }];
                return (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Input
                        placeholder="Condition — e.g. Phantom pregnancy"
                        value={c.name}
                        onChangeText={(v) => setPet({ conditions: list.map((x, j) => (j === i ? { ...x, name: v } : x)) })}
                      />
                      <Input
                        placeholder="What it means for the sitter"
                        value={c.meaning}
                        onChangeText={(v) => setPet({ conditions: list.map((x, j) => (j === i ? { ...x, meaning: v } : x)) })}
                        multiline
                      />
                    </View>
                    {list.length > 1 && (
                      <TouchableOpacity onPress={() => setPet({ conditions: list.filter((_, j) => j !== i) })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingTop: 14 }}>
                        <Trash size={16} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              <TouchableOpacity onPress={() => setPet({ conditions: [...(pet.conditions ?? [{ name: "", meaning: "" }]), { name: "", meaning: "" }] })} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Satoshi-Medium" }}>+ Add another condition</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Eyebrow>Allergies</Eyebrow>
            {/* One line per allergy — not a single field with everything
                run together. */}
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, marginBottom: 2 }}>
              Add each one — food, environmental, medication.
            </Text>
            <View style={{ gap: 8, marginTop: 4 }}>
              {(pet.allergies ?? [""]).map((a, i) => {
                const list = pet.allergies ?? [""];
                return (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    {/* multiline so a longer entry grows the field to fit
                        instead of scrolling out of view. */}
                    <Input
                      style={{ flex: 1 }}
                      placeholder="Food, environmental, medication…"
                      value={a}
                      onChangeText={(v) => setPet({ allergies: list.map((x, j) => (j === i ? v : x)) })}
                      multiline
                    />
                    {list.length > 1 && (
                      <TouchableOpacity onPress={() => setPet({ allergies: list.filter((_, j) => j !== i) })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingTop: 14 }}>
                        <Trash size={16} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              <TouchableOpacity onPress={() => setPet({ allergies: [...(pet.allergies ?? [""]), ""] })} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Satoshi-Medium" }}>+ Add another allergy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 28, gap: 10 }}>
        <PrimaryButton label={saving ? "Saving…" : "Finish profile"} onPress={finish} disabled={saving} />
        {/* Skip still creates the pet + link — it just leaves routine/medical
            empty. Previously it navigated away without saving anything. */}
        <SkipButton label={`Skip for now — save ${pet.name ? `${pet.name}'s` : "their"} profile`} onPress={finish} disabled={saving} />
      </View>
    </OnboardingShell>
  );
}
