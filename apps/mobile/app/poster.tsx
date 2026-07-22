// Missing poster + social tile generator — "JUST IN CASE"
// Ported from the Figma export's ScreenMissingPoster with the brief's copy
// corrections. Generation happens server-side (Satori + sharp) via the
// Next.js API route; this screen collects the ephemeral fields and downloads
// the finished PNGs.
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Share, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";
import { Eyebrow, Input } from "../components/ui";
import { useActivePetStore } from "../stores/activePet";
import { colors, computeAge } from "@quirksandall/shared";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://quirksandall.app";

type PosterProfile = {
  name: string;
  breed: string;
  sex: string;
  age: string;
  weight: string;
  colorMarkings: string;
  microchip: string;
  photoUrl: string | null;
  descriptionForId: string;
  ownerPhone: string;
  token: string;
};

type OutputFormat = { key: "poster" | "1x1" | "4x5" | "9x16"; label: string; aspect: number };

const SOCIAL_FORMATS: OutputFormat[] = [
  { key: "1x1", label: "1:1 — Square", aspect: 1 },
  { key: "4x5", label: "4:5 — Portrait", aspect: 4 / 5 },
  { key: "9x16", label: "9:16 — Story", aspect: 9 / 16 },
];

export default function MissingPoster() {
  const { petId: selectedPetId } = useActivePetStore();
  const [profile, setProfile] = useState<PosterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"form" | "output">("form");
  const [format, setFormat] = useState<"poster" | "social">("poster");
  const [whatToLookFor, setWhatToLookFor] = useState("");
  const [lastSeenArea, setLastSeenArea] = useState("");
  const [lastSeenDate, setLastSeenDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [selectedPetId]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    let petQuery = supabase
      .from("pets")
      .select("id, name, breed, sex, dob, dob_is_estimated, weight, color_markings, microchip_number, photo_url, description_for_id")
      .eq("owner_id", user.id)
      .eq("status", "active");
    petQuery = selectedPetId ? petQuery.eq("id", selectedPetId) : petQuery.order("created_at").limit(1);
    const { data: pet } = await petQuery.single();
    if (!pet) { router.back(); return; }

    const [{ data: owner }, { data: link }] = await Promise.all([
      supabase.from("owners").select("primary_phone").eq("id", user.id).single(),
      supabase.from("share_links").select("token").eq("pet_id", pet.id).eq("revoked", false)
        .order("created_at", { ascending: false }).limit(1).single(),
    ]);

    setProfile({
      name: pet.name,
      breed: pet.breed ?? "",
      sex: pet.sex ?? "",
      age: computeAge(pet.dob, pet.dob_is_estimated),
      weight: pet.weight ?? "",
      colorMarkings: pet.color_markings ?? "",
      microchip: pet.microchip_number ?? "",
      photoUrl: pet.photo_url,
      descriptionForId: pet.description_for_id ?? "",
      ownerPhone: owner?.primary_phone ?? "",
      token: link?.token ?? "",
    });
    setWhatToLookFor(pet.description_for_id ?? "");
    setLoading(false);
  };

  const outputUrl = (key: string) => {
    const params = new URLSearchParams({
      token: profile!.token,
      format: key,
      lastSeenArea,
      lastSeenDate,
      lookFor: whatToLookFor,
    });
    return `${WEB_URL}/api/generate-poster?${params.toString()}`;
  };

  const saveOutput = async (key: string) => {
    if (!profile) return;
    setSaving(key);
    try {
      const fileUri = `${FileSystem.cacheDirectory}${profile.name.toLowerCase()}-missing-${key}.png`;
      const { status, uri } = await FileSystem.downloadAsync(outputUrl(key), fileUri);
      if (status !== 200) throw new Error("Generation failed");
      await Share.share({ url: uri, message: `${profile.name} is missing.` });
    } catch {
      Alert.alert("Couldn't save", "Check your connection and try again.");
    } finally {
      setSaving(null);
    }
  };

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.textDark} />
      </View>
    );
  }

  const hasPhoto = !!profile.photoUrl;
  const snapshotRows = [
    { label: "Weight", val: profile.weight },
    { label: "Colour", val: profile.colorMarkings },
    { label: "Microchip", val: profile.microchip },
    { label: "Your phone", val: profile.ownerPhone },
  ].filter((r) => r.val);

  // ── Output view ─────────────────────────────────────────────────────────────
  if (view === "output") {
    const formats: OutputFormat[] =
      format === "poster" ? [{ key: "poster", label: "Poster", aspect: 1240 / 1754 }] : SOCIAL_FORMATS;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: 56, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setView("form")}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", backgroundColor: colors.secondary, borderRadius: 999, padding: 2 }}>
            {(["poster", "social"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFormat(f)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999,
                  backgroundColor: format === f ? colors.cardBg : "transparent",
                }}
              >
                <Text style={{ color: format === f ? colors.textDark : colors.textMuted, fontSize: 12, fontWeight: "500" }}>
                  {f === "poster" ? "Poster" : "Social"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ width: 48 }} />
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginBottom: 16 }}>
          Done. Walls, feeds, group chats — wherever.
        </Text>

        <View style={{ paddingHorizontal: 16, gap: 28 }}>
          {formats.map((f) => (
            <View key={f.key}>
              {format === "social" && (
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                  {f.label}
                </Text>
              )}
              <Image
                source={{ uri: outputUrl(f.key) }}
                style={{ width: "100%", aspectRatio: f.aspect, borderRadius: 8, backgroundColor: colors.secondary }}
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() => saveOutput(f.key)}
                disabled={saving !== null}
                style={{
                  marginTop: 12, height: 40, borderRadius: 10, backgroundColor: colors.button,
                  alignItems: "center", justifyContent: "center", alignSelf: "flex-end", paddingHorizontal: 18,
                  opacity: saving && saving !== f.key ? 0.5 : 1,
                }}
              >
                {saving === f.key ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Text style={{ color: colors.buttonText, fontSize: 13, fontWeight: "600" }}>
                    Save {f.key === "poster" ? "poster" : f.key.replace("x", ":")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 }}>
          {format === "poster" ? "Print at A4 for best results." : "Each format downloads as a high-res PNG."}
        </Text>
      </ScrollView>
    );
  }

  // ── Form view ───────────────────────────────────────────────────────────────
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28 }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>← Dashboard</Text>
      </TouchableOpacity>

      <Eyebrow>Just in case</Eyebrow>
      <Text style={{ fontFamily: "Tanker", fontSize: 34, lineHeight: 40, color: colors.textDark, marginTop: 6 }}>
        If {profile.name} goes missing.
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8, lineHeight: 21, marginBottom: 20 }}>
        One tap. Everywhere it needs to be. Here if you ever need it.
      </Text>

      {!hasPhoto && (
        <View style={{ backgroundColor: "rgba(184,58,82,0.1)", borderWidth: 1, borderColor: "rgba(184,58,82,0.3)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "500" }}>
            {profile.name} needs a photo for the poster. Add one in the profile first.
          </Text>
        </View>
      )}

      {/* Pre-filled snapshot */}
      <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <Text>📷</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: "500" }}>{profile.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {[profile.breed, profile.sex, profile.age].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/edit/pet")}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "500" }}>Edit profile</Text>
          </TouchableOpacity>
        </View>
        {snapshotRows.map((row, i) => (
          <View key={row.label} style={{ flexDirection: "row", gap: 16, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: i < snapshotRows.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500", width: 80 }}>{row.label}</Text>
            <Text style={{ color: colors.textDark, fontSize: 14, flex: 1 }}>{row.val}</Text>
          </View>
        ))}
      </View>

      {/* What to look for */}
      <View style={{ marginBottom: 16 }}>
        <Eyebrow>What did they have on when you last saw them?</Eyebrow>
        <TextInput
          value={whatToLookFor}
          onChangeText={setWhatToLookFor}
          placeholder="Grey knit jumper, pink bedazzled leash, red collar underneath."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          style={{
            marginTop: 6, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border,
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
            color: colors.textDark, minHeight: 80, textAlignVertical: "top",
          }}
        />
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>Not saved — just for this.</Text>
      </View>

      {/* Last seen */}
      <View style={{ marginBottom: 24 }}>
        <Eyebrow>Last seen</Eyebrow>
        <View style={{ marginTop: 6, gap: 8 }}>
          <Input value={lastSeenArea} onChangeText={setLastSeenArea} placeholder="Newtown" />
          <Input value={lastSeenDate} onChangeText={setLastSeenDate} placeholder="YYYY-MM-DD" />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>Not saved to your profile.</Text>
      </View>

      <TouchableOpacity
        onPress={() => setView("output")}
        disabled={!hasPhoto || !profile.token}
        style={{
          height: 48, borderRadius: 10, backgroundColor: colors.button,
          alignItems: "center", justifyContent: "center",
          opacity: hasPhoto && profile.token ? 1 : 0.4,
        }}
      >
        <Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: "500" }}>Generate</Text>
      </TouchableOpacity>
      {!hasPhoto && (
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
          Add a photo to {profile.name}'s profile first.
        </Text>
      )}
    </ScrollView>
  );
}
