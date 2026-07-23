// Native in-app preview of the recipient "cheat sheet" — what a sitter sees.
// The owner previews their own pet, so we fetch directly (RLS allows the owner)
// and show the full picture regardless of tier, with no browser chrome.
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useActivePetStore } from "../stores/activePet";
import { colors, computeAge, formatWeight } from "@quirksandall/shared";

type Data = {
  name: string; breed: string; age: string; photoUrl: string | null;
  weight: string; sex: string; color: string; microchip: string;
  commands: any[];
  scared: string; noGo: string; flightRisk: string;
  allergies: string[];
  feeding: any; walks: string; sleep: string; bathroom: string;
  conditions: string[]; medications: any[];
  vet: any; owner: { name: string; phone: string }; backups: any[];
  hasPin: boolean;
  updatedAt: string;
};

function formatFeeding(f: any): string {
  if (!f) return "";
  const slots = [
    f.breakfast?.time && `Breakfast ${f.breakfast.time}: ${f.breakfast.amount ?? ""}`.trim(),
    f.lunch?.time && `Lunch ${f.lunch.time}: ${f.lunch.amount ?? ""}`.trim(),
    f.dinner?.time && `Dinner ${f.dinner.time}: ${f.dinner.amount ?? ""}`.trim(),
  ].filter(Boolean);
  const treats = f.treats?.type ? `Treats: ${f.treats.type}${f.treats.limit ? ` (${f.treats.limit})` : ""}` : "";
  return [...slots, treats, f.notes].filter(Boolean).join(". ");
}

export default function Preview() {
  const { petId: selectedPetId } = useActivePetStore();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"quick" | "full">("quick");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }

      let petQuery = supabase.from("pets")
        .select("id, name, breed, dob, dob_is_estimated, sex, weight, color_markings, microchip_number, photo_url, updated_at")
        .eq("owner_id", user.id).eq("status", "active");
      petQuery = selectedPetId ? petQuery.eq("id", selectedPetId) : petQuery.order("created_at").limit(1);
      const { data: pet } = await petQuery.single();
      if (!pet) { router.back(); return; }

      const [{ data: behavior }, { data: medical }, { data: routine }, { data: vet }, { data: owner }, { data: link }] = await Promise.all([
        supabase.from("pet_behavior").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_medical").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_routine").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("pet_vet_info").select("*").eq("pet_id", pet.id).maybeSingle(),
        supabase.from("owners").select("name, primary_phone, backup_contacts").eq("id", user.id).single(),
        supabase.from("share_links").select("pin_hash").eq("pet_id", pet.id).eq("revoked", false).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      setData({
        name: pet.name, breed: pet.breed ?? "", age: computeAge(pet.dob, pet.dob_is_estimated), photoUrl: pet.photo_url,
        weight: formatWeight(pet.weight), sex: pet.sex ?? "", color: pet.color_markings ?? "", microchip: pet.microchip_number ?? "",
        commands: behavior?.commands ?? [],
        scared: behavior?.scared ?? "", noGo: behavior?.no_go ?? "", flightRisk: behavior?.flight_risk ?? "",
        allergies: medical?.allergies ?? [],
        feeding: routine?.feeding ?? null, walks: routine?.walks ?? "", sleep: routine?.sleep ?? "", bathroom: routine?.bathroom_habits ?? "",
        conditions: medical?.conditions ?? [], medications: medical?.medications ?? [],
        vet: vet ?? {}, owner: { name: owner?.name ?? "", phone: owner?.primary_phone ?? "" }, backups: owner?.backup_contacts ?? [],
        hasPin: !!link?.pin_hash,
        updatedAt: pet.updated_at,
      });
      setLoading(false);
    })();
  }, [selectedPetId]);

  if (loading || !data) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.textDark} /></View>;
  }

  const showFull = view === "full";
  const idTiles = [
    ["Weight", data.weight], ["Sex", data.sex], ["Colour", data.color], ["Microchip", data.microchip],
  ].filter(([, v]) => !!v);
  const hasQuirks = data.scared || data.noGo || data.flightRisk;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Preview banner */}
      <View style={{ backgroundColor: colors.cardDark, paddingTop: 56, paddingBottom: 12, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ color: "rgba(248,236,238,0.7)", fontSize: 14 }}>‹ Done</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.cardDarkText, fontSize: 12, fontFamily: "Satoshi-Medium", letterSpacing: 0.5 }}>PREVIEW</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        {/* Identity */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 }}>
          {data.photoUrl && (
            <Image source={{ uri: data.photoUrl }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.border }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Tanker", fontSize: 26, lineHeight: 30, color: colors.textDark }}>{data.name}'s Cheat Sheet</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{[data.breed, data.age].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>

        {idTiles.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {idTiles.map(([label, val]) => (
              <View key={label} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: "47%" }}>
                <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5, color: colors.textMuted }}>{label}</Text>
                <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Satoshi-Medium", marginTop: 2 }}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick / Full toggle */}
        <View style={{ flexDirection: "row", gap: 4, backgroundColor: "#EFE7D8", borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {(["quick", "full"] as const).map((v) => (
            <TouchableOpacity key={v} onPress={() => setView(v)} style={{ flex: 1, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: view === v ? colors.cardDark : "transparent" }}>
              <Text style={{ fontSize: 14, fontFamily: "Satoshi-Medium", color: view === v ? colors.cardDarkText : colors.textMuted }}>{v === "quick" ? "Quick view" : "Full view"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ gap: 20 }}>
          {/* Emergency contacts */}
          <Section label="Emergency contacts">
            {data.hasPin && (
              <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Satoshi-Light", marginBottom: 8 }}>
                🔒 Sitters enter your PIN to see this block. Shown here for your preview.
              </Text>
            )}
            <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 12 }}>
              <ContactRow label="Vet" name={[data.vet.primary_vet?.contact_name, data.vet.primary_vet?.clinic].filter(Boolean).join(" · ")} phone={data.vet.primary_vet?.phone} />
              <ContactRow label="Emergency vet" name={data.vet.emergency_vet?.clinic} phone={data.vet.emergency_vet?.phone} />
              <ContactRow label="Insurance" name={data.vet.insurance?.provider} phone={data.vet.insurance?.claims_contact} />
              <ContactRow label="Owner" name={data.owner.name} phone={data.owner.phone} />
              {data.backups.map((b, i) => (
                <ContactRow key={i} label={`Backup${b.relationship ? ` — ${b.relationship}` : ""}`} name={b.name} phone={b.phone} />
              ))}
            </View>
          </Section>

          {/* Commands */}
          {data.commands.length > 0 && (
            <Section label="Commands">
              <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" }}>
                {data.commands.map((cmd, i) => (
                  <View key={cmd.id ?? i} style={{ paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border, backgroundColor: i % 2 === 0 ? "#FFFFFF" : colors.background }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: colors.primary, fontSize: 14, fontFamily: "Satoshi-Bold" }}>{cmd.word}</Text>
                      {cmd.reward ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>🎁 {cmd.reward}</Text> : null}
                    </View>
                    {cmd.meaning ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{cmd.meaning}</Text> : null}
                    {cmd.howToCue ? <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: "italic", marginTop: 2 }}>Cue: {cmd.howToCue}</Text> : null}
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* Quirks */}
          {hasQuirks && (
            <Section label="Quirks & triggers">
              <View style={{ gap: 8 }}>
                {data.scared ? <QuirkCard label="Scared of" text={data.scared} /> : null}
                {data.noGo ? <QuirkCard label="Off-limits" text={data.noGo} /> : null}
                {data.flightRisk ? <QuirkCard label="Flight risk" text={data.flightRisk} highlight /> : null}
              </View>
            </Section>
          )}

          {/* Allergies */}
          {data.allergies.length > 0 && (
            <Section label="Allergies">
              <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ color: colors.primary, fontSize: 14 }}>{data.allergies.join(", ")}</Text>
              </View>
            </Section>
          )}

          {/* Routine — full view */}
          {showFull && (data.feeding || data.walks || data.sleep) && (
            <Section label="Routine">
              <View style={{ gap: 8 }}>
                {formatFeeding(data.feeding) ? <RoutineCard label="Feeding" text={formatFeeding(data.feeding)} /> : null}
                {data.walks ? <RoutineCard label="Walks" text={data.walks} /> : null}
                {data.sleep ? <RoutineCard label="Sleep" text={data.sleep} /> : null}
                {data.bathroom ? <RoutineCard label="Bathroom" text={data.bathroom} /> : null}
              </View>
            </Section>
          )}

          {/* Medical — full view */}
          {showFull && (data.conditions.length > 0 || data.medications.length > 0) && (
            <Section label="Medical">
              <View style={{ gap: 8 }}>
                {data.conditions.length > 0 && <RoutineCard label="Conditions" text={data.conditions.join(", ")} />}
                {data.medications.map((m, i) => (
                  <RoutineCard key={i} label="Medication" text={[m.name, m.dose].filter(Boolean).join(" — ") + (m.notes ? `. ${m.notes}` : "")} />
                ))}
              </View>
            </Section>
          )}

          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 8, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Last updated {new Date(data.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontSize: 11, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5, color: colors.textMuted, marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

function ContactRow({ label, name, phone }: { label: string; name?: string; phone?: string }) {
  if (!name && !phone) return null;
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5, color: colors.textMuted }}>{label}</Text>
      {name ? <Text style={{ color: colors.primary, fontSize: 14, fontFamily: "Satoshi-Bold" }}>{name}</Text> : null}
      {phone ? <Text style={{ color: colors.primary, fontSize: 14 }}>{phone}</Text> : null}
    </View>
  );
}

function QuirkCard({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  return (
    <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: highlight ? colors.caution : colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
      <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5, color: highlight ? colors.caution : colors.textMuted, marginBottom: 2 }}>{label}</Text>
      <Text style={{ color: colors.primary, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

function RoutineCard({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
      <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5, color: colors.textMuted, marginBottom: 2 }}>{label}</Text>
      <Text style={{ color: colors.primary, fontSize: 14 }}>{text}</Text>
    </View>
  );
}
