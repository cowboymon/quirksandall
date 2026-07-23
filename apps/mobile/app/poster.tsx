// Missing poster + social tile generator — "JUST IN CASE"
// Ported from the Figma export's ScreenMissingPoster with the brief's copy
// corrections. Generation happens server-side (Satori + sharp) via the
// Next.js API route; this screen collects the ephemeral fields and downloads
// the finished PNGs.
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Share, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
// SDK 54 moved the classic download/read/write API to /legacy; the new
// File/Directory API isn't needed for these one-shot poster downloads.
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { Eyebrow, Input, DateInput } from "../components/ui";
import { useActivePetStore } from "../stores/activePet";
import { colors, computeAge, formatWeight, isoToDisplayDate, displayDateToISO, capitalizeFirst } from "@quirksandall/shared";

import { WEB_URL } from "../lib/config";

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
  const [lastSeenDate, setLastSeenDate] = useState(isoToDisplayDate(new Date().toISOString().split("T")[0]));
  const [saving, setSaving] = useState<string | null>(null);
  // Per-format photo override: format key → data URI; previews hold the
  // locally cached PNG generated with that override.
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [regenerating, setRegenerating] = useState<string | null>(null);

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

  const outputUrl = (key: string, preview = false) => {
    const params = new URLSearchParams({
      token: profile!.token,
      format: key,
      lastSeenArea,
      lastSeenDate,
      lookFor: whatToLookFor,
      ...(preview ? { preview: "1" } : {}),
    });
    return `${WEB_URL}/api/generate-poster?${params.toString()}`;
  };

  // Generate a format server-side with an overridden photo (POST + data URI),
  // cache the PNG locally, and return its file URI.
  const generateWithOverride = async (key: string, photoDataUri: string): Promise<string> => {
    const res = await fetch(`${WEB_URL}/api/generate-poster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: profile!.token,
        format: key,
        lastSeenArea,
        lastSeenDate,
        lookFor: whatToLookFor,
        photoDataUri,
      }),
    });
    if (!res.ok) throw new Error("Generation failed");
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const fileUri = `${FileSystem.cacheDirectory}${profile!.name.toLowerCase()}-missing-${key}-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return fileUri;
  };

  const pickPhotoFor = async (key: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to change the photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;
    const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setRegenerating(key);
    try {
      const fileUri = await generateWithOverride(key, dataUri);
      setOverrides((o) => ({ ...o, [key]: dataUri }));
      setPreviews((p) => ({ ...p, [key]: fileUri }));
    } catch {
      Alert.alert("Couldn't generate", "Check your connection and try again.");
    } finally {
      setRegenerating(null);
    }
  };

  // Entering the output view: previews built with overridden photos need a
  // rebuild in case the ephemeral form fields changed since last time.
  const openOutput = async () => {
    setView("output");
    for (const key of Object.keys(overrides)) {
      setRegenerating(key);
      try {
        const uri = await generateWithOverride(key, overrides[key]);
        setPreviews((p) => ({ ...p, [key]: uri }));
      } catch {
        // keep the stale preview rather than blocking the view
      }
    }
    setRegenerating(null);
  };

  const saveOutput = async (key: string) => {
    if (!profile) return;
    setSaving(key);
    try {
      let uri = previews[key];
      if (!uri) {
        const fileUri = `${FileSystem.cacheDirectory}${profile.name.toLowerCase()}-missing-${key}.png`;
        const dl = await FileSystem.downloadAsync(outputUrl(key), fileUri);
        if (dl.status !== 200) throw new Error("Generation failed");
        uri = dl.uri;
      }
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
  // Always show all four rows (matching the design); a missing value renders as
  // "Not provided" rather than dropping the row entirely.
  const snapshotRows = [
    { label: "Weight", val: formatWeight(profile.weight) },
    { label: "Colour", val: profile.colorMarkings },
    { label: "Microchip", val: profile.microchip },
    { label: "Your phone", val: profile.ownerPhone },
  ];

  // ── Output view ─────────────────────────────────────────────────────────────
  if (view === "output") {
    const formats: OutputFormat[] =
      format === "poster" ? [{ key: "poster", label: "Poster", aspect: 1240 / 1754 }] : SOCIAL_FORMATS;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: 56, paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setView("form")}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>‹ Back</Text>
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
                <Text style={{ color: format === f ? colors.textDark : colors.textMuted, fontSize: 12, fontFamily: "Satoshi-Medium" }}>
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
                <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Satoshi-Medium", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                  {f.label}
                </Text>
              )}
              <View>
                <Image
                  source={{ uri: previews[f.key] ?? outputUrl(f.key, true) }}
                  style={{ width: "100%", aspectRatio: f.aspect, borderRadius: 8, backgroundColor: colors.secondary }}
                  resizeMode="contain"
                />
                {regenerating === f.key && (
                  <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(248,236,238,0.6)", borderRadius: 8 }}>
                    <ActivityIndicator color={colors.textDark} />
                  </View>
                )}
              </View>
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <TouchableOpacity onPress={() => pickPhotoFor(f.key)} disabled={regenerating !== null} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="camera-outline" size={15} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: "Satoshi-Medium" }}>
                    Change photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => saveOutput(f.key)}
                  disabled={saving !== null || regenerating !== null}
                  style={{
                    height: 40, borderRadius: 10, backgroundColor: colors.button,
                    alignItems: "center", justifyContent: "center", paddingHorizontal: 18,
                    opacity: saving && saving !== f.key ? 0.5 : 1,
                  }}
                >
                  {saving === f.key ? (
                    <ActivityIndicator size="small" color={colors.buttonText} />
                  ) : (
                    <Text style={{ color: colors.buttonText, fontSize: 13, fontFamily: "Satoshi-Medium" }}>
                      Save {f.key === "poster" ? "poster" : f.key.replace("x", ":")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28 }}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>‹ Dashboard</Text>
      </TouchableOpacity>

      <Eyebrow>Just in case</Eyebrow>
      <Text style={{ fontFamily: "Tanker", fontSize: 34, lineHeight: 40, color: colors.textDark, marginTop: 6 }}>
        If {profile.name} goes missing.
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8, lineHeight: 21, marginBottom: 20 }}>
        One tap. Everywhere it needs to be. Here if you ever need it.
      </Text>

      {/* Pre-filled snapshot */}
      <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>{profile.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {[profile.breed, profile.sex, profile.age].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/edit/pet")}>
            <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium" }}>Edit profile</Text>
          </TouchableOpacity>
        </View>
        {snapshotRows.map((row, i) => (
          <View key={row.label} style={{ flexDirection: "row", gap: 16, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: i < snapshotRows.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: "Satoshi-Medium", width: 80 }}>{row.label}</Text>
            <Text style={{ color: row.val ? colors.textDark : colors.dashedBorder, fontSize: 14, flex: 1 }}>{row.val || "Not provided"}</Text>
          </View>
        ))}
      </View>

      {/* What to look for */}
      <View style={{ marginBottom: 16 }}>
        <Eyebrow>What did they have on when you last saw them?</Eyebrow>
        <TextInput
          value={whatToLookFor}
          onChangeText={(t) => setWhatToLookFor(capitalizeFirst(t))}
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
          <Input value={lastSeenArea} onChangeText={setLastSeenArea} placeholder="Newtown IGA @ 4:40pm" />
          <DateInput value={lastSeenDate} onChangeText={setLastSeenDate} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>Not saved to your profile.</Text>
      </View>

      <TouchableOpacity
        onPress={openOutput}
        disabled={!hasPhoto || !profile.token}
        style={{
          height: 48, borderRadius: 10, backgroundColor: colors.button,
          alignItems: "center", justifyContent: "center",
          opacity: hasPhoto && profile.token ? 1 : 0.4,
        }}
      >
        <Text style={{ color: colors.buttonText, fontSize: 15, fontFamily: "Satoshi-Medium" }}>Generate</Text>
      </TouchableOpacity>
      {!hasPhoto && (
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
          Add a photo to {profile.name}'s profile first.
        </Text>
      )}
    </ScrollView>
  );
}
