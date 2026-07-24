// Native in-app preview of the recipient "cheat sheet" — ports the prototype's
// ScreenRecipient. The owner previews their own pet, so we fetch directly (RLS)
// and show the full picture (emergency block un-gated for the preview).
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "../lib/supabase";
import { useActivePetStore } from "../stores/activePet";
import { FieldTier } from "../components/ui";
import { colors, computeAge, formatWeight, formatPhone, formatVetName, possessive } from "@quirksandall/shared";

type Data = {
  name: string; breed: string; age: string; photoUrl: string | null;
  weight: string; sex: string; color: string; microchip: string;
  vetContactName: string; vetClinic: string; vetPhone: string;
  emergVetClinic: string; emergVetPhone: string;
  vetPreAuth: boolean; insuranceProvider: string; insurancePolicy: string;
  backupName: string; backupPhone: string; backupRel: string;
  backup2Name: string; backup2Phone: string; backup2Rel: string;
  commands: any[];
  scared: string; noGo: string; flightRisk: string; temperament: string;
  allergies: string; conditions: string; medications: string;
  feeding: any; walks: string; sleep: string; bathroom: string;
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
  const { petId: selectedPetId } = useActivePetStore();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [view, setView] = useState<"quick" | "full">("full");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
      if (!user) { router.replace("/auth"); return; }

      let q = supabase.from("pets")
        .select("id, name, breed, dob, dob_is_estimated, sex, weight, color_markings, microchip_number, photo_url, updated_at")
        .eq("owner_id", user.id).eq("status", "active");
      q = selectedPetId ? q.eq("id", selectedPetId) : q.order("created_at").limit(1);
      const { data: pet } = await q.single();
      if (!pet) { router.back(); return; }

      const [{ data: behavior }, { data: medical }, { data: routine }, { data: vet }, { data: owner }] = await Promise.all([
        supabase.from("pet_behavior").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_medical").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_routine").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_vet_info").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("owners").select("backup_contacts, purchase_status").eq("id", user.id).single(),
      ]);

      setIsPaid(owner?.purchase_status === "paid");
      const backups = owner?.backup_contacts ?? [];
      const meds = (medical?.medications ?? []).map((m: any) => [m.name, m.dose].filter(Boolean).join(" ")).filter(Boolean).join("; ");

      setData({
        name: (pet.name ?? "").trim(), breed: pet.breed ?? "", age: computeAge(pet.dob, pet.dob_is_estimated), photoUrl: pet.photo_url,
        weight: formatWeight(pet.weight), sex: pet.sex ?? "", color: pet.color_markings ?? "", microchip: pet.microchip_number ?? "",
        vetContactName: vet?.primary_vet?.contact_name ?? "", vetClinic: vet?.primary_vet?.clinic ?? "", vetPhone: vet?.primary_vet?.phone ?? "",
        emergVetClinic: vet?.emergency_vet?.clinic ?? "", emergVetPhone: vet?.emergency_vet?.phone ?? "",
        vetPreAuth: vet?.vet_pre_auth ?? false, insuranceProvider: vet?.insurance?.provider ?? "", insurancePolicy: vet?.insurance?.policy_number ?? "",
        backupName: backups[0]?.name ?? "", backupPhone: backups[0]?.phone ?? "", backupRel: backups[0]?.relationship ?? "",
        backup2Name: backups[1]?.name ?? "", backup2Phone: backups[1]?.phone ?? "", backup2Rel: backups[1]?.relationship ?? "",
        commands: behavior?.commands ?? [],
        scared: behavior?.scared ?? "", noGo: behavior?.no_go ?? "", flightRisk: behavior?.flight_risk ?? "", temperament: behavior?.temperament_summary ?? "",
        allergies: (medical?.allergies ?? []).join(", "), conditions: (medical?.conditions ?? []).join(", "), medications: meds,
        feeding: routine?.feeding ?? null, walks: routine?.walks ?? "", sleep: routine?.sleep ?? "", bathroom: routine?.bathroom_habits ?? "",
        updatedAt: pet.updated_at,
      });
      setLoading(false);
    })();
  }, [selectedPetId]);

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
  const hasFeeding = !!(f.breakfast?.time || f.breakfast?.amount || f.lunch?.time || f.lunch?.amount || f.dinner?.time || f.dinner?.amount || f.treats?.type || f.notes);

  const CreamLink = ({ icon, text, onPress, bold }: { icon: "location" | "call"; text: string; onPress: () => void; bold?: boolean }) => (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
      <Ionicons name={icon === "location" ? "location-outline" : "call-outline"} size={13} color="rgba(248,236,238,0.8)" />
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
          <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
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
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.cardDarkText, fontSize: 11, fontFamily: "Satoshi-Bold", textTransform: "uppercase", letterSpacing: 0.5 }}>In an emergency</Text>
            </View>
            <View style={{ gap: 16 }}>
              {(d.vetContactName || d.vetClinic || d.vetPhone) && (
                <View>
                  <Text style={{ ...microLabel, color: "rgba(248,236,238,0.6)" }}>Vet</Text>
                  {d.vetContactName ? <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Bold", marginTop: 2 }}>{formatVetName(d.vetContactName)}</Text> : null}
                  {d.vetClinic ? <CreamLink icon="location" text={d.vetClinic} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(d.vetClinic)}`)} /> : null}
                  {d.vetPhone ? <CreamLink icon="call" text={formatPhone(d.vetPhone)} onPress={() => Linking.openURL(`tel:${d.vetPhone}`)} /> : null}
                </View>
              )}
              {(d.emergVetClinic || d.emergVetPhone) && (
                <View>
                  <Text style={{ ...microLabel, color: "rgba(248,236,238,0.6)" }}>Emergency vet</Text>
                  {d.emergVetClinic ? <CreamLink icon="location" text={d.emergVetClinic} bold onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(d.emergVetClinic)}`)} /> : null}
                  {d.emergVetPhone ? <CreamLink icon="call" text={formatPhone(d.emergVetPhone)} onPress={() => Linking.openURL(`tel:${d.emergVetPhone}`)} /> : null}
                </View>
              )}
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
              {/* Vet pre-auth — below the backup contacts (#20) */}
              {d.vetPreAuth && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(248,236,238,0.1)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#88C888" />
                  <Text style={{ color: "rgba(248,236,238,0.8)", fontSize: 12, flex: 1, lineHeight: 16 }}>Vet pre-authorised — {d.backupName && d.backup2Name ? "backup contacts" : "backup contact"} can approve treatment</Text>
                </View>
              )}
            </View>
          </View>

          {/* Order (#15): Daily Routine → Medication → Allergies → Commands → Triggers.
              Feeding is free at every tier; walks/sleep/bathroom are paid. */}
          {(hasFeeding || (showFull && (d.walks || d.sleep || d.bathroom))) && (
            <View>
              <SectionHeader lead={possessive(d.name)} underline="Daily Routine" />
              <View style={{ gap: 12 }}>
                {hasFeeding && (
                  <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" }}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                      <Text style={{ ...microLabel, color: colors.primary }}>Feeding</Text>
                    </View>
                    {[["Breakfast", f.breakfast], ["Lunch", f.lunch], ["Dinner", f.dinner]].map(([label, slot]: any, i) => (
                      <MealRow key={label} label={label} time={slot?.time} amount={slot?.amount} divider={i < 2} />
                    ))}
                    {(f.treats?.type || f.treats?.limit) ? (
                      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "flex-start" }}>
                        <Text style={{ width: 64, fontSize: 13, fontFamily: "Satoshi-Medium", color: colors.textMuted }}>Treats</Text>
                        <View style={{ flex: 1 }}>
                          {f.treats?.type ? <Text style={{ fontSize: 13, color: BODY }}>{f.treats.type}</Text> : null}
                          {f.treats?.limit ? <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Satoshi-Light", marginTop: 2 }}>{f.treats.limit}</Text> : null}
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
                {showFull && d.walks ? <InfoCard label="Walks" text={d.walks} locked={locked} /> : null}
                {showFull && d.sleep ? <InfoCard label="Sleep" text={d.sleep} locked={locked} /> : null}
                {showFull && d.bathroom ? <InfoCard label="Bathroom" text={d.bathroom} locked={locked} /> : null}
              </View>
            </View>
          )}

          {showFull && (d.medications || d.conditions) && (
            <View>
              <SectionHeader lead={possessive(d.name)} underline="Medication" locked={locked} />
              <View style={{ gap: 12 }}>
                {d.conditions ? <InfoCard label="Conditions" text={d.conditions} /> : null}
                {d.medications ? <InfoCard label="Medications" text={d.medications} /> : null}
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
                    <Text style={{ width: "26%", fontSize: 13, fontFamily: "Satoshi-Bold", color: BODY }}>"{cmd.word}"</Text>
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
                {showFull && d.scared ? <InfoCard label="Scared of" text={d.scared} locked={locked} /> : null}
                {showFull && d.noGo ? <InfoCard label="No-go zones" text={d.noGo} locked={locked} /> : null}
                {showFull && d.temperament ? <InfoCard label="Temperament" text={d.temperament} locked={locked} /> : null}
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{ marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", fontFamily: "Satoshi-Light" }}>
            Made with love by {possessive(d.name)} person · updated {new Date(d.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
          <Text style={{ color: colors.textDark, fontSize: 11, textAlign: "center", marginTop: 4, fontFamily: "Satoshi-Medium" }}>Quirks & All · quirksandall.itshypothetical.com</Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

function MealRow({ label, time, amount, divider }: { label: string; time?: string; amount?: string; divider: boolean }) {
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.border, alignItems: "baseline" }}>
      <Text style={{ width: 64, fontSize: 13, fontFamily: "Satoshi-Medium", color: colors.textMuted }}>{label}</Text>
      {time || amount ? (
        <Text style={{ flex: 1, fontSize: 13, color: BODY }}>
          {time ? <Text style={{ fontFamily: "Satoshi-Medium" }}>{time}</Text> : null}{time && amount ? " · " : ""}{amount}
        </Text>
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
