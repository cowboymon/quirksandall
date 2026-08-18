// Native in-app preview of the recipient "cheat sheet" — ports the prototype's
// ScreenRecipient. The owner previews their own pet, so we fetch directly (RLS)
// and show the full picture (emergency block un-gated for the preview).
import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking } from "react-native";
import { CaretDown, CaretLeft, CaretUp, MapPin, Phone } from "../components/icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import { AppAlert } from "../stores/appAlert";
import { useActivePetStore } from "../stores/activePet";
import { MARKETING_URL, PRIVACY_URL } from "../lib/config";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { FieldTier } from "../components/ui";
import { colors, computeAge, formatWeight, formatPhone, formatVetName, possessive, orderedCommands, commandStrengthLabel, mealSlotLabel, shortAddress, isUnlocked, treatEntries } from "@quirksandall/shared";

type Data = {
  name: string; breed: string; age: string; photoUrl: string | null;
  weight: string; sex: string; color: string; microchip: string;
  vetContactName: string; vetClinic: string; vetAddress: string; vetPhone: string;
  emergVetClinic: string; emergVetAddress: string; emergVetPhone: string;
  insuranceProvider: string; insurancePolicy: string;
  backupName: string; backupPhone: string; backupRel: string;
  backup2Name: string; backup2Phone: string; backup2Rel: string;
  // Ordered, already-filtered to whoever's marked as a decision contact
  // (1st entry = call first). Instructional only — see RecipientView's twin
  // of this block for the full rationale.
  decisionContacts: { name: string; phone: string }[];
  commands: any[];
  scared: string; noGo: string; flightRisk: string; temperament: string;
  allergies: string; conditions: string; meds: { name: string; dose: string; withMeal?: string[]; notes?: string }[];
  feeding: any; walks: string; sleep: string; bathroom: string; leftAlone: string; toileting: string;
  updatedAt: string;
};

// Tanker section header (no squiggle on the recipient/preview view — #45).
// A right-aligned "Unlock to share" pill appears on paid-gated sections.
function SectionHeader({ lead, underline, locked }: { lead: string; underline: string; locked?: boolean }) {
  const style = { fontFamily: "Tanker", fontSize: 22, lineHeight: 26, color: colors.textDark } as const;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
      <Text style={[style, { flexShrink: 1 }]}>{lead} {underline}</Text>
      {locked ? <FieldTier /> : null}
    </View>
  );
}

const microLabel = { fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6 } as const;
// Body/content copy renders in a neutral near-black; the crimson (textDark) and
// rose (primary) brand colours are reserved for titles and eyebrow labels.
const BODY = "#1F1A17";

export default function Preview() {
  useRequireAuth();
  const { petId: selectedPetId } = useActivePetStore();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [view, setView] = useState<"quick" | "full">("full");
  // Matches the recipient page: the block opens by default and can be folded
  // away after a first read. Previewed so the owner sees the same affordance
  // a sitter gets.
  const [emergencyOpen, setEmergencyOpen] = useState(true);

  // Refetch on every focus, not just mount — same stale-data issue as the
  // poster screen (#17, build-21 smoke test): editing the pet's photo
  // elsewhere and returning here left this preview showing the old one until
  // the screen was torn down and rebuilt.
  useFocusEffect(
    useCallback(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
      if (!user) { router.replace("/auth"); return; }

      let q = supabase.from("pets")
        .select("id, name, breed, dob, dob_is_estimated, sex, weight, color_markings, microchip_number, photo_url, updated_at")
        .eq("owner_id", user.id).eq("status", "active");
      q = selectedPetId ? q.eq("id", selectedPetId) : q.order("created_at").limit(1);
      const { data: pet, error: petError } = await q.single();
      if (!pet) {
        setLoading(false);
        AppAlert.alert(
          "Couldn't load preview",
          petError ? "Check your connection and try again." : "No active pet found.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }

      const [{ data: behavior }, { data: medical }, { data: routine }, { data: vet }, { data: owner }] = await Promise.all([
        supabase.from("pet_behavior").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_medical").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_routine").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_vet_info").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("owners").select("backup_contacts, purchase_status, expires_at").eq("id", user.id).single(),
      ]);

      const paid = isUnlocked(owner);
      setIsPaid(paid);
      // Only preview backup contacts the owner consented to share — this
      // screen's whole point is showing exactly what a sitter would see.
      const backups = (owner?.backup_contacts ?? []).filter((c: any) => c.consent_to_share);
      const decisionContacts = backups
        .filter((c: any) => c.is_decision_contact)
        .sort((a: any, b: any) => (a.decision_priority ?? 99) - (b.decision_priority ?? 99))
        .map((c: any) => ({ name: c.name ?? "", phone: c.phone ?? "" }));
      const meds = (medical?.medications ?? []).map((m: any) => ({
        name: m.name ?? "", dose: m.dose ?? "",
        // Legacy rows (pre-#94 follow-up) stored a bare string.
        withMeal: m.with_meal == null ? undefined : Array.isArray(m.with_meal) ? m.with_meal : [m.with_meal],
        notes: m.notes || undefined,
      }));

      setData({
        name: (pet.name ?? "").trim(), breed: pet.breed ?? "", age: computeAge(pet.dob, pet.dob_is_estimated), photoUrl: pet.photo_url,
        weight: formatWeight(pet.weight), sex: pet.sex ?? "", color: pet.color_markings ?? "", microchip: pet.microchip_number ?? "",
        vetContactName: vet?.primary_vet?.contact_name ?? "", vetClinic: vet?.primary_vet?.clinic ?? "", vetAddress: vet?.primary_vet?.address ?? "", vetPhone: vet?.primary_vet?.phone ?? "",
        emergVetClinic: vet?.emergency_vet?.clinic ?? "", emergVetAddress: vet?.emergency_vet?.address ?? "", emergVetPhone: vet?.emergency_vet?.phone ?? "",
        insuranceProvider: vet?.insurance?.provider ?? "", insurancePolicy: vet?.insurance?.policy_number ?? "",
        backupName: backups[0]?.name ?? "", backupPhone: backups[0]?.phone ?? "", backupRel: backups[0]?.relationship ?? "",
        backup2Name: backups[1]?.name ?? "", backup2Phone: backups[1]?.phone ?? "", backup2Rel: backups[1]?.relationship ?? "",
        decisionContacts,
        commands: orderedCommands(behavior?.commands ?? [], paid, false),
        scared: behavior?.scared ?? "", noGo: behavior?.no_go ?? "", flightRisk: behavior?.flight_risk ?? "", temperament: behavior?.temperament_summary ?? "",
        allergies: (medical?.allergies ?? []).join(", "), conditions: (medical?.conditions ?? []).join(", "), meds,
        feeding: routine?.feeding ?? null, walks: routine?.walks ?? "", sleep: routine?.sleep ?? "", bathroom: routine?.bathroom_habits ?? "",
        leftAlone: routine?.left_alone?.ok ? (routine.left_alone.detail ? `${routine.left_alone.ok} — ${routine.left_alone.detail}` : routine.left_alone.ok) : "",
        toileting: routine?.toileting_frequency ?? "",
        updatedAt: pet.updated_at,
      });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPetId])
  );

  if (loading || !data) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.textDark} /></View>;
  }

  const d = data;
  const f = d.feeding ?? {};
  const idTiles = [["Weight", d.weight], ["Sex", d.sex], ["Colour", d.color], ["Microchip", d.microchip]].filter(([, v]) => !!v);
  const showFull = view === "full";
  // Free plan → the paid fields carry a "Paid" badge so the owner sees what a
  // sitter would unlock. Feeding, flight risk, allergies and commands are free.
  const locked = !isPaid;
  // A meal needs both time and amount to render (#93). Bare times aren't useful.
  const mealComplete = (slot: any) => !!(!slot?.skip && slot?.time && slot?.amount);
  // A meal renders if it has its own time+amount, OR if a medication is tied
  // to it — otherwise a med tied to an unfilled-in meal (e.g. "with lunch"
  // when lunch itself was never filled in) would have nowhere to point from.
  const allMealSlots = [["Breakfast", "breakfast", f.breakfast], ["Lunch", "lunch", f.lunch], ["Dinner", "dinner", f.dinner]] as const;
  const meals = allMealSlots.filter(([, key, slot]) => mealComplete(slot) || (slot as any)?.skip || d.meds.some((m) => m.withMeal?.includes(key)));
  // "Anytime" meds aren't tied to a meal at all, so they never matched any
  // row above and were invisible on Feeding — the card that's meant to be
  // the day's source of truth — with no sign there was anything else to
  // check. Surfaced as its own row below the meals, same "+ name — dose"
  // treatment as a meal-tied medication.
  const anytimeMeds = d.meds.filter((m) => m.withMeal?.includes("anytime"));
  const hasFeeding = !!(meals.length || anytimeMeds.length || treatEntries(f.treats).length || f.notes);
  // Meds tied to a shown meal ALSO render inline in the routine as a
  // convenience, but every medication always shows in the standalone
  // Medication section too — that's the safety-critical section a sitter is
  // most likely to check (#94 follow-up).

  const CreamLink = ({ icon, text, onPress, bold }: { icon: "location" | "call"; text: string; onPress: () => void; bold?: boolean }) => (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
      {icon === "location" ? <MapPin size={13} color="rgba(248,236,238,0.8)" /> : <Phone size={13} color="rgba(248,236,238,0.8)" />}
      <Text style={{ color: "rgba(248,236,238,0.85)", fontSize: 14, fontFamily: bold ? "Satoshi-Bold" : "Satoshi", textDecorationLine: icon === "location" ? "underline" : "none" }}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky header — persistent back-to-Dashboard nav, matching the edit
          screens (#73). Stays put while the sheet scrolls beneath it. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 58,
          paddingBottom: 12,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ minWidth: 96, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <CaretLeft size={16} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>Dashboard</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", fontFamily: "Satoshi-Bold", fontSize: 16, color: colors.textDark }}>Preview</Text>
        <View style={{ minWidth: 96 }} />
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 48 }}>
      <View style={{ paddingHorizontal: 24 }}>
        {/* Identity */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12, marginBottom: 16 }}>
          {d.photoUrl && <Image source={{ uri: d.photoUrl }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.border }} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Tanker", fontSize: 28, lineHeight: 30, color: colors.textDark }}>{possessive(d.name)} Cheat Sheet</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{[d.breed, d.age].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>

        {/* Basics grid */}
        {idTiles.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {idTiles.map(([label, val]) => (
              <View key={label} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: "47.5%" }}>
                <Text style={{ ...microLabel, color: colors.textMuted }}>{label}</Text>
                <Text numberOfLines={1} style={{ color: BODY, fontSize: 13, fontFamily: "Satoshi-Medium", marginTop: 2 }}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick / Full toggle */}
        <View style={{ flexDirection: "row", gap: 4, backgroundColor: colors.secondary, borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {(["quick", "full"] as const).map((v) => (
            <TouchableOpacity key={v} onPress={() => setView(v)} style={{ flex: 1, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: view === v ? colors.cardDark : "transparent" }}>
              <Text style={{ fontSize: 14, fontFamily: "Satoshi-Medium", color: view === v ? colors.cardDarkText : colors.textMuted }}>{v === "quick" ? "Quick view" : "Full view"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ gap: 20 }}>
          {/* Emergency contacts — dark card (un-gated for the owner's preview) */}
          <View style={{ backgroundColor: colors.cardDark, borderRadius: 12, padding: 20 }}>
            {/* Collapsible, as on the recipient page — a long list a sitter only
                needs in a pinch, so it folds away after a first read. */}
            <TouchableOpacity
              onPress={() => setEmergencyOpen((o) => !o)}
              accessibilityRole="button"
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: emergencyOpen ? 16 : 0 }}
            >
              <Text style={{ color: colors.cardDarkText, fontSize: 11, fontFamily: "Satoshi-Bold", textTransform: "uppercase", letterSpacing: 0.5 }}>In an emergency</Text>
              {emergencyOpen ? <CaretUp size={16} color="rgba(248,236,238,0.6)" /> : <CaretDown size={16} color="rgba(248,236,238,0.6)" />}
            </TouchableOpacity>
            <View style={{ gap: 16, display: emergencyOpen ? "flex" : "none" }}>
              {(d.vetContactName || d.vetClinic || d.vetPhone) && (
                <View>
                  <Text style={{ ...microLabel, color: "rgba(248,236,238,0.6)" }}>Vet</Text>
                  {d.vetContactName ? <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Bold", marginTop: 2 }}>{formatVetName(d.vetContactName)}</Text> : null}
                  {d.vetClinic ? <CreamLink icon="location" text={d.vetClinic} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent([d.vetClinic, d.vetAddress].filter(Boolean).join(", "))}`)} /> : null}
                  {d.vetAddress ? <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 14, fontFamily: "Satoshi", marginTop: 2 }}>{shortAddress(d.vetAddress)}</Text> : null}
                  {d.vetPhone ? <CreamLink icon="call" text={formatPhone(d.vetPhone)} onPress={() => Linking.openURL(`tel:${d.vetPhone}`)} /> : null}
                </View>
              )}
              {(d.emergVetClinic || d.emergVetPhone) && (
                <View>
                  <Text style={{ ...microLabel, color: "rgba(248,236,238,0.6)" }}>Emergency vet</Text>
                  {d.emergVetClinic ? <CreamLink icon="location" text={d.emergVetClinic} bold onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent([d.emergVetClinic, d.emergVetAddress].filter(Boolean).join(", "))}`)} /> : null}
                  {d.emergVetAddress ? <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 14, fontFamily: "Satoshi", marginTop: 2 }}>{shortAddress(d.emergVetAddress)}</Text> : null}
                  {d.emergVetPhone ? <CreamLink icon="call" text={formatPhone(d.emergVetPhone)} onPress={() => Linking.openURL(`tel:${d.emergVetPhone}`)} /> : null}
                </View>
              )}
              <TouchableOpacity
                onPress={() => Linking.openURL("https://www.google.com/maps/search/emergency+vet+near+me")}
                style={{ alignSelf: "flex-start" }}
              >
                <Text style={{ color: "rgba(248,236,238,0.55)", fontSize: 12, fontFamily: "Satoshi" }}>
                  Not at {possessive(d.name)} home? Find an emergency vet near me
                </Text>
              </TouchableOpacity>
              {(d.insuranceProvider || d.insurancePolicy) && (
                <View>
                  <Text style={{ ...microLabel, color: "rgba(248,236,238,0.6)" }}>Insurance</Text>
                  <Text style={{ color: colors.cardDarkText, fontSize: 14, marginTop: 2 }}>{[d.insuranceProvider, d.insurancePolicy].filter(Boolean).join(" · ")}</Text>
                </View>
              )}
              {d.backupName ? (
                <View>
                  <Text style={{ ...microLabel, color: "rgba(248,236,238,0.6)" }}>{d.backupRel ? `Backup — ${d.backupRel}` : "Backup contact"}</Text>
                  <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Bold", marginTop: 2 }}>{d.backupName}</Text>
                  {d.backupPhone ? <CreamLink icon="call" text={formatPhone(d.backupPhone)} onPress={() => Linking.openURL(`tel:${d.backupPhone}`)} /> : null}
                </View>
              ) : null}
              {d.backup2Name ? (
                <View>
                  <Text style={{ ...microLabel, color: "rgba(248,236,238,0.6)" }}>{d.backup2Rel ? `Second backup — ${d.backup2Rel}` : "Second backup"}</Text>
                  <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Bold", marginTop: 2 }}>{d.backup2Name}</Text>
                  {d.backup2Phone ? <CreamLink icon="call" text={formatPhone(d.backup2Phone)} onPress={() => Linking.openURL(`tel:${d.backup2Phone}`)} /> : null}
                </View>
              ) : null}
              {d.decisionContacts.length > 0 && (
                <View>
                  <Text style={{ ...microLabel, color: "rgba(248,236,238,0.6)" }}>Decisions about {possessive(d.name)} care</Text>
                  {d.decisionContacts.map((c, i) => (
                    <Text key={i} style={{ color: colors.cardDarkText, fontSize: 14, marginTop: 2 }}>
                      {i === 0 && d.decisionContacts.length > 1
                        ? `Call ${c.name} first — ${formatPhone(c.phone)}`
                        : d.decisionContacts.length > 1
                        ? `If ${d.decisionContacts[0].name} can't be reached, call ${c.name} — ${formatPhone(c.phone)}`
                        : `Call ${c.name} — ${formatPhone(c.phone)}`}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Order (#15): Daily Routine (Feeding → Medication → walks/sleep/
              bathroom) → Allergies → Commands → Triggers. Medication sits
              right after Feeding & Meds — it's the safety-critical section
              and shouldn't sit behind walks/sleep/bathroom as a scroll
              hurdle. Feeding & Medication are free at every tier; the rest
              of the routine is paid. */}
          {(hasFeeding || d.meds.length > 0 || d.conditions || (showFull && (d.walks || d.sleep || d.bathroom || d.leftAlone || d.toileting))) && (
            <View>
              <SectionHeader lead={possessive(d.name)} underline="Daily Routine" />
              <View style={{ gap: 12 }}>
                {hasFeeding && (
                  <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" }}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                      <Text style={{ ...microLabel, color: colors.primary }}>Feeding & Meds</Text>
                    </View>
                    {meals.map(([label, key, slot]: any, i) => {
                      const tied = d.meds.filter((m) => m.withMeal?.includes(key));
                      return (
                        <View key={label} style={{ borderBottomWidth: i < meals.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                          <MealRow label={label} time={slot?.skip ? undefined : slot?.time} amount={slot?.skip ? undefined : slot?.amount} skipped={!!slot?.skip} divider={false} medOnly={tied.length > 0 && !mealComplete(slot)} />
                          {tied.map((m, mi) => (
                            <Text key={mi} style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium", paddingLeft: 80, paddingRight: 16, paddingBottom: 8 }}>
                              + {[m.name, m.dose].filter(Boolean).join(" — ")}
                            </Text>
                          ))}
                          {tied.length > 0 && (
                            <Text style={{ color: colors.textMuted, fontSize: 11, paddingLeft: 80, paddingRight: 16, paddingBottom: 8 }}>
                              See Medications for notes
                            </Text>
                          )}
                        </View>
                      );
                    })}
                    {anytimeMeds.length > 0 && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <MealRow label="Anytime" divider={false} medOnly />
                        {anytimeMeds.map((m, mi) => (
                          <Text key={mi} style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium", paddingLeft: 80, paddingRight: 16, paddingBottom: 8 }}>
                            + {[m.name, m.dose].filter(Boolean).join(" — ")}
                          </Text>
                        ))}
                        <Text style={{ color: colors.textMuted, fontSize: 11, paddingLeft: 80, paddingRight: 16, paddingBottom: 8 }}>
                          See Medications for notes
                        </Text>
                      </View>
                    )}
                    {treatEntries(f.treats).length ? (
                      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "flex-start" }}>
                        <Text style={{ width: 64, fontSize: 13, fontFamily: "Satoshi-Medium", color: colors.textMuted }}>Treats</Text>
                        <View style={{ flex: 1, gap: 4 }}>
                          {/* Limit inline rather than stacked — see the same
                              note in the web RecipientView. */}
                          {treatEntries(f.treats).map((t, ti) => (
                            <Text key={ti} style={{ fontSize: 13, color: BODY }}>
                              {t.type}
                              {t.type && t.limit ? <Text style={{ color: colors.textMuted, fontFamily: "Satoshi-Light" }}> — {t.limit}</Text> : null}
                              {!t.type && t.limit ? <Text style={{ color: colors.textMuted, fontFamily: "Satoshi-Light" }}>{t.limit}</Text> : null}
                            </Text>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    {f.notes ? (
                      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: "Satoshi-Light" }}>{f.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
                {/* Medication & conditions — free at every tier (#87
                    follow-up): a sitter dosing the wrong thing because the
                    owner hadn't paid is a safety failure. Shows in both
                    quick and full view, like allergies. Placed here (right
                    after Feeding & Meds, before walks/sleep/bathroom) so
                    it's not gated behind paid-only fields. */}
                {d.conditions ? <InfoCard label="Conditions" text={d.conditions} /> : null}
                {d.meds.map((m, i) => (
                  <View key={i} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.primary }}>Medication</Text>
                    <Text style={{ color: BODY, fontSize: 14, fontFamily: "Satoshi-Bold", marginTop: 6 }}>{[m.name, m.dose].filter(Boolean).join(" — ")}</Text>
                    {mealSlotLabel(m.withMeal) ? (
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{mealSlotLabel(m.withMeal)}</Text>
                    ) : null}
                    {m.notes ? (
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>{m.notes}</Text>
                    ) : null}
                  </View>
                ))}
                {showFull && d.walks ? <InfoCard label="Walks" text={d.walks} locked={locked} /> : null}
                {showFull && d.sleep ? <InfoCard label="Sleep" text={d.sleep} locked={locked} /> : null}
                {showFull && d.bathroom ? <InfoCard label="Bathroom" text={d.bathroom} locked={locked} /> : null}
                {showFull && d.leftAlone ? <InfoCard label="Left alone" text={d.leftAlone} locked={locked} /> : null}
                {showFull && d.toileting ? <InfoCard label="Toileting" text={d.toileting} locked={locked} /> : null}
              </View>
            </View>
          )}

          {d.allergies ? (
            <View>
              <SectionHeader lead={possessive(d.name)} underline="Allergies" />
              <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 }}>
                <Text style={{ color: BODY, fontSize: 14, lineHeight: 20 }}>{d.allergies}</Text>
              </View>
            </View>
          ) : null}

          {d.commands.length > 0 && (
            <View>
              <SectionHeader lead={possessive(d.name)} underline="Commands" />
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ width: "26%", ...microLabel, color: colors.textMuted }}>Word</Text>
                  <Text style={{ flex: 1, ...microLabel, color: colors.textMuted }}>Means</Text>
                  <Text style={{ width: "26%", ...microLabel, color: colors.textMuted }}>Reward</Text>
                </View>
                {d.commands.map((cmd, i) => (
                  <View key={cmd.id ?? i} style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: i % 2 === 0 ? "#FFFFFF" : colors.background, alignItems: "flex-start" }}>
                    <View style={{ width: "26%" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Satoshi-Bold", color: BODY }}>"{cmd.word}"</Text>
                      {commandStrengthLabel(cmd.strength) ? (
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, fontFamily: "Satoshi-Medium" }}>{commandStrengthLabel(cmd.strength)}</Text>
                      ) : null}
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 13, color: BODY }}>{cmd.meaning}</Text>
                      {cmd.howToCue ? <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: "italic", marginTop: 2 }}>Cue: {cmd.howToCue}</Text> : null}
                    </View>
                    <Text style={{ width: "26%", fontSize: 12, color: colors.textMuted }}>{cmd.reward}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {(d.flightRisk || (showFull && (d.scared || d.noGo || d.temperament))) && (
            <View>
              <SectionHeader lead={possessive(d.name)} underline="Triggers" />
              <View style={{ gap: 12 }}>
                {/* Flight risk is a safety override — free at every tier */}
                {d.flightRisk ? <InfoCard label="Flight risk" text={d.flightRisk} /> : null}
                {showFull && d.temperament ? <InfoCard label="Temperament" text={d.temperament} locked={locked} /> : null}
                {showFull && d.scared ? <InfoCard label="Scared of" text={d.scared} locked={locked} /> : null}
                {showFull && d.noGo ? <InfoCard label="No-go zones" text={d.noGo} locked={locked} /> : null}
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{ marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", fontFamily: "Satoshi-Light" }}>
            Made with love by {possessive(d.name)} person · updated {new Date(d.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
          <Text style={{ color: colors.textDark, fontSize: 11, textAlign: "center", marginTop: 4, fontFamily: "Satoshi-Medium" }}>
            Quirks & All ·{" "}
            <Text style={{ textDecorationLine: "underline" }} onPress={() => Linking.openURL(MARKETING_URL)}>
              quirksandall.itshypothetical.com
            </Text>
          </Text>
          {/* Mirrors the web recipient page's footer notice. Nothing is tracked
              in this native preview — it's the owner looking at their own pet —
              but the whole point of this screen is to show what a sitter sees,
              and a notice the owner never sees is one they can't vouch for. */}
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 14, fontFamily: "Satoshi-Light" }}>
            This page counts anonymous views ·{" "}
            <Text style={{ textDecorationLine: "underline", fontFamily: "Satoshi-Medium" }} onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

function MealRow({ label, time, amount, divider, medOnly, skipped }: { label: string; time?: string; amount?: string; divider: boolean; medOnly?: boolean; skipped?: boolean }) {
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.border, alignItems: "baseline" }}>
      <Text style={{ width: 64, fontSize: 13, fontFamily: "Satoshi-Medium", color: colors.textMuted }}>{label}</Text>
      {skipped ? (
        <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, fontStyle: "italic" }}>Doesn't have {label.toLowerCase()}</Text>
      ) : time || amount ? (
        <Text style={{ flex: 1, fontSize: 13, color: BODY }}>
          {time ? <Text style={{ fontFamily: "Satoshi-Medium" }}>{time}</Text> : null}{time && amount ? " · " : ""}{amount}
        </Text>
      ) : medOnly ? (
        <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, fontStyle: "italic" }}>Medication only</Text>
      ) : (
        <Text style={{ flex: 1, fontSize: 13, color: colors.dashedBorder }}>—</Text>
      )}
    </View>
  );
}

function InfoCard({ label, text, locked }: { label: string; text: string; locked?: boolean }) {
  return (
    <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.primary }}>{label}</Text>
        {locked ? <FieldTier /> : null}
      </View>
      <Text style={{ color: BODY, fontSize: 14, marginTop: 6, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}
