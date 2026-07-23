// Native in-app preview of the recipient "cheat sheet" — ports the prototype's
// ScreenRecipient. The owner previews their own pet, so we fetch directly (RLS)
// and show the full picture (emergency block un-gated for the preview).
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useActivePetStore } from "../stores/activePet";
import { Underlined } from "../components/Underlined";
import { colors, computeAge, formatWeight } from "@quirksandall/shared";

type Data = {
  name: string; breed: string; age: string; photoUrl: string | null;
  weight: string; sex: string; color: string; microchip: string;
  vetContactName: string; vetClinic: string; vetPhone: string;
  emergVetClinic: string; emergVetPhone: string;
  vetPreAuth: boolean; insuranceProvider: string; insurancePolicy: string;
  backupName: string; backupPhone: string; backupRel: string;
  backup2Name: string; backup2Phone: string;
  commands: any[];
  scared: string; noGo: string; flightRisk: string;
  allergies: string;
  feeding: any; walks: string; sleep: string; medications: string;
  updatedAt: string;
};

// Tanker section header, optionally with a squiggle-underlined tail.
function SectionHeader({ lead, underline }: { lead: string; underline?: string }) {
  const style = { fontFamily: "Tanker", fontSize: 22, lineHeight: 26, color: colors.textDark } as const;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
      <Text style={style}>{lead}{underline ? " " : ""}</Text>
      {underline ? <Underlined><Text style={style}>{underline}</Text></Underlined> : null}
    </View>
  );
}

function Label({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: light ? "rgba(248,236,238,0.5)" : colors.textMuted }}>
      {children}
    </Text>
  );
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
        supabase.from("owners").select("backup_contacts").eq("id", user.id).single(),
      ]);

      const backups = owner?.backup_contacts ?? [];
      const meds = (medical?.medications ?? []).map((m: any) => [m.name, m.dose].filter(Boolean).join(" ")).filter(Boolean).join("; ");

      setData({
        name: pet.name, breed: pet.breed ?? "", age: computeAge(pet.dob, pet.dob_is_estimated), photoUrl: pet.photo_url,
        weight: formatWeight(pet.weight), sex: pet.sex ?? "", color: pet.color_markings ?? "", microchip: pet.microchip_number ?? "",
        vetContactName: vet?.primary_vet?.contact_name ?? "", vetClinic: vet?.primary_vet?.clinic ?? "", vetPhone: vet?.primary_vet?.phone ?? "",
        emergVetClinic: vet?.emergency_vet?.clinic ?? "", emergVetPhone: vet?.emergency_vet?.phone ?? "",
        vetPreAuth: vet?.vet_pre_auth ?? false, insuranceProvider: vet?.insurance?.provider ?? "", insurancePolicy: vet?.insurance?.policy_number ?? "",
        backupName: backups[0]?.name ?? "", backupPhone: backups[0]?.phone ?? "", backupRel: backups[0]?.relationship ?? "",
        backup2Name: backups[1]?.name ?? "", backup2Phone: backups[1]?.phone ?? "",
        commands: behavior?.commands ?? [],
        scared: behavior?.scared ?? "", noGo: behavior?.no_go ?? "", flightRisk: behavior?.flight_risk ?? "",
        allergies: (medical?.allergies ?? []).join(", "),
        feeding: routine?.feeding ?? null, walks: routine?.walks ?? "", sleep: routine?.sleep ?? "", medications: meds,
        updatedAt: pet.updated_at,
      });
      setLoading(false);
    })();
  }, [selectedPetId]);

  if (loading || !data) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.textDark} /></View>;
  }

  const f = data.feeding ?? {};
  const idTiles = [["Weight", data.weight], ["Sex", data.sex], ["Colour", data.color], ["Microchip", data.microchip]].filter(([, v]) => !!v);
  const hasQuirks = data.scared || data.noGo || data.flightRisk;

  const CreamLink = ({ icon, text, onPress, bold }: { icon: "location" | "call"; text: string; onPress: () => void; bold?: boolean }) => (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
      <Ionicons name={icon === "location" ? "location-outline" : "call-outline"} size={13} color="rgba(248,236,238,0.8)" />
      <Text style={{ color: "rgba(248,236,238,0.85)", fontSize: 14, fontFamily: bold ? "Satoshi-Bold" : "Satoshi", textDecorationLine: "underline" }}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: 56, paddingBottom: 48 }}>
      {/* Owner dashboard back */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Owner dashboard</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        {/* Identity */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12, marginBottom: 16 }}>
          {data.photoUrl && <Image source={{ uri: data.photoUrl }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.border }} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Tanker", fontSize: 28, lineHeight: 30, color: colors.textDark }}>{data.name}'s Cheat Sheet</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{[data.breed, data.age].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>

        {/* Basics grid */}
        {idTiles.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {idTiles.map(([label, val]) => (
              <View key={label} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: "47.5%" }}>
                <Label>{label}</Label>
                <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 13, fontFamily: "Satoshi-Medium", marginTop: 2 }}>{val}</Text>
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Ionicons name="lock-open-outline" size={14} color={colors.cardDarkText} />
              <Text style={{ color: colors.cardDarkText, fontSize: 11, fontFamily: "Satoshi-Bold", textTransform: "uppercase", letterSpacing: 0.5 }}>Emergency contacts</Text>
            </View>
            <Text style={{ color: "rgba(248,236,238,0.5)", fontSize: 11, fontFamily: "Satoshi-Light", marginBottom: 16 }}>
              🔒 Sitters enter your PIN to see this. Shown here for your preview.
            </Text>
            <View style={{ gap: 16 }}>
              {(data.vetContactName || data.vetClinic || data.vetPhone) && (
                <View>
                  <Label light>Vet</Label>
                  {data.vetContactName ? <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Bold", marginTop: 2 }}>{data.vetContactName}</Text> : null}
                  {data.vetClinic ? <CreamLink icon="location" text={data.vetClinic} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(data.vetClinic)}`)} /> : null}
                  {data.vetPhone ? <CreamLink icon="call" text={data.vetPhone} onPress={() => Linking.openURL(`tel:${data.vetPhone}`)} /> : null}
                </View>
              )}
              {(data.emergVetClinic || data.emergVetPhone) && (
                <View>
                  <Label light>Emergency vet</Label>
                  {data.emergVetClinic ? <CreamLink icon="location" text={data.emergVetClinic} bold onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(data.emergVetClinic)}`)} /> : null}
                  {data.emergVetPhone ? <CreamLink icon="call" text={data.emergVetPhone} onPress={() => Linking.openURL(`tel:${data.emergVetPhone}`)} /> : null}
                </View>
              )}
              {data.vetPreAuth && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(248,236,238,0.1)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#88C888" />
                  <Text style={{ color: "rgba(248,236,238,0.8)", fontSize: 12, flex: 1, lineHeight: 16 }}>Vet pre-authorised — backup contact can approve treatment</Text>
                </View>
              )}
              {(data.insuranceProvider || data.insurancePolicy) && (
                <View>
                  <Label light>Insurance</Label>
                  <Text style={{ color: colors.cardDarkText, fontSize: 14, marginTop: 2 }}>{[data.insuranceProvider, data.insurancePolicy].filter(Boolean).join(" · ")}</Text>
                </View>
              )}
              {data.backupName ? (
                <View>
                  <Label light>{data.backupRel ? `Backup — ${data.backupRel}` : "Backup contact"}</Label>
                  <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Bold", marginTop: 2 }}>{data.backupName}</Text>
                  {data.backupPhone ? <CreamLink icon="call" text={data.backupPhone} onPress={() => Linking.openURL(`tel:${data.backupPhone}`)} /> : null}
                </View>
              ) : null}
              {data.backup2Name ? (
                <View>
                  <Label light>Second backup</Label>
                  <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Bold", marginTop: 2 }}>{data.backup2Name}</Text>
                  {data.backup2Phone ? <CreamLink icon="call" text={data.backup2Phone} onPress={() => Linking.openURL(`tel:${data.backup2Phone}`)} /> : null}
                </View>
              ) : null}
            </View>
          </View>

          {/* Commands — table */}
          {data.commands.length > 0 && (
            <View>
              <SectionHeader lead="Commands" underline={`${data.name} knows`} />
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ width: "26%", ...labelStyle }}>Word</Text>
                  <Text style={{ flex: 1, ...labelStyle }}>Means</Text>
                  <Text style={{ width: "26%", ...labelStyle }}>Reward</Text>
                </View>
                {data.commands.map((cmd, i) => (
                  <View key={cmd.id ?? i} style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: i % 2 === 0 ? "#FFFFFF" : colors.background, alignItems: "flex-start" }}>
                    <Text style={{ width: "26%", fontSize: 13, fontFamily: "Satoshi-Bold", color: colors.textDark }}>"{cmd.word}"</Text>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 13, color: colors.textDark }}>{cmd.meaning}</Text>
                      {cmd.howToCue ? <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: "italic", marginTop: 2 }}>Cue: {cmd.howToCue}</Text> : null}
                    </View>
                    <Text style={{ width: "26%", fontSize: 12, color: colors.textMuted }}>{cmd.reward}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quirks */}
          {hasQuirks && (
            <View>
              <SectionHeader lead="Quirks" underline="& triggers" />
              <View style={{ gap: 12 }}>
                {data.scared ? <QuirkCard label="Scared of" text={data.scared} /> : null}
                {data.noGo ? <QuirkCard label="No-go zones" text={data.noGo} /> : null}
                {data.flightRisk ? <QuirkCard label="Flight risk" text={data.flightRisk} /> : null}
              </View>
            </View>
          )}

          {/* Allergies */}
          {data.allergies ? (
            <View>
              <SectionHeader lead="Allergies" />
              <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 }}>
                <Text style={{ color: colors.primary, fontSize: 14, lineHeight: 20 }}>{data.allergies}</Text>
              </View>
            </View>
          ) : null}

          {/* Daily routine — full view */}
          {view === "full" && (data.feeding || data.walks || data.sleep || data.medications) && (
            <View>
              <SectionHeader lead="Daily" underline="routine" />
              <View style={{ gap: 12 }}>
                {/* Feeding card */}
                <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" }}>
                  <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.primary }}>Feeding</Text>
                  </View>
                  {[["Breakfast", f.breakfast], ["Lunch", f.lunch], ["Dinner", f.dinner]].map(([label, slot]: any, i) => (
                    <MealRow key={label} label={label} time={slot?.time} amount={slot?.amount} divider={i < 2} />
                  ))}
                  {(f.treats?.type || f.treats?.limit) ? (
                    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "flex-start" }}>
                      <Text style={{ width: 64, fontSize: 13, fontFamily: "Satoshi-Medium", color: colors.textMuted }}>Treats</Text>
                      <View style={{ flex: 1 }}>
                        {f.treats?.type ? <Text style={{ fontSize: 13, color: colors.textDark }}>{f.treats.type}</Text> : null}
                        {f.treats?.limit ? <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Satoshi-Light", marginTop: 2 }}>{f.treats.limit}</Text> : null}
                      </View>
                    </View>
                  ) : null}
                  {f.notes ? (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: "Satoshi-Light" }}>{f.notes}</Text>
                    </View>
                  ) : null}
                  {data.medications ? (
                    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "flex-start" }}>
                      <Text style={{ width: 64, fontSize: 13, fontFamily: "Satoshi-Medium", color: colors.textMuted }}>Meds</Text>
                      <Text style={{ flex: 1, fontSize: 13, color: colors.textDark, lineHeight: 18 }}>{data.medications}</Text>
                    </View>
                  ) : null}
                </View>
                {data.walks ? <QuirkCard label="Walks" text={data.walks} /> : null}
                {data.sleep ? <QuirkCard label="Sleep" text={data.sleep} /> : null}
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{ marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", fontFamily: "Satoshi-Light" }}>
            Made with love by {data.name}'s owner · updated {new Date(data.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
          <Text style={{ color: colors.dashedBorder, fontSize: 11, textAlign: "center", marginTop: 4, fontFamily: "Satoshi-Light" }}>Quirks & All · quirksandall.app</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const labelStyle = { fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.textMuted } as const;

function MealRow({ label, time, amount, divider }: { label: string; time?: string; amount?: string; divider: boolean }) {
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.border, alignItems: "baseline" }}>
      <Text style={{ width: 64, fontSize: 13, fontFamily: "Satoshi-Medium", color: colors.textMuted }}>{label}</Text>
      {time || amount ? (
        <Text style={{ flex: 1, fontSize: 13, color: colors.textDark }}>
          {time ? <Text style={{ fontFamily: "Satoshi-Medium" }}>{time}</Text> : null}{time && amount ? " · " : ""}{amount}
        </Text>
      ) : (
        <Text style={{ flex: 1, fontSize: 13, color: colors.dashedBorder }}>—</Text>
      )}
    </View>
  );
}

function QuirkCard({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16 }}>
      <Text style={{ fontSize: 10, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.6, color: colors.primary }}>{label}</Text>
      <Text style={{ color: colors.primary, fontSize: 14, marginTop: 6, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}
