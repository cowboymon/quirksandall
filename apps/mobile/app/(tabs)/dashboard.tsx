import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Share, Alert, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { registerForPushNotifications, scheduleTrickNudge } from "../../lib/notifications";
import { Eyebrow, Card } from "../../components/ui";
import QRModal from "../../components/QRModal";
import PetSwitcher from "../../components/PetSwitcher";
import { useActivePetStore } from "../../stores/activePet";
import { colors, computeAge, pinAttemptLabel } from "@quirksandall/shared";
import { WEB_URL } from "../../lib/config";
import type { Pet, ShareLink } from "@quirksandall/shared";

type DashboardData = {
  pet: Pet & { age: string };
  link: ShareLink;
  wrongPinCount: number;
  sections: { label: string; detail: string; status: "done" | "saved" | "empty"; route: string }[];
  isPaid: boolean;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const { petId: selectedPetId } = useActivePetStore();

  useEffect(() => {
    loadDashboard();
  }, [selectedPetId]); // reload when user switches pet

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    const { data: ownerData } = await supabase
      .from("owners")
      .select("purchase_status")
      .eq("id", user.id)
      .single();

    let petQuery = supabase.from("pets").select("*").eq("owner_id", user.id).eq("status", "active");
    if (selectedPetId) {
      petQuery = petQuery.eq("id", selectedPetId);
    } else {
      petQuery = petQuery.order("created_at").limit(1);
    }
    const { data: pet } = await petQuery.single();

    if (!pet) {
      // No pet yet — go to onboarding
      router.replace("/onboarding/step1");
      return;
    }

    const { data: link } = await supabase
      .from("share_links")
      .select("*")
      .eq("pet_id", pet.id)
      .eq("revoked", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Count wrong PINs today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: wrongPinCount } = await supabase
      .from("pin_attempts")
      .select("id", { count: "exact", head: true })
      .eq("link_id", link?.id)
      .eq("success", false)
      .gte("attempted_at", today.toISOString());

    const { data: behavior } = await supabase
      .from("pet_behavior")
      .select("commands")
      .eq("pet_id", pet.id)
      .single();

    const isPaid = ownerData?.purchase_status === "paid";
    const age = computeAge(pet.dob, pet.dob_is_estimated);

    setData({
      pet: { ...pet, age },
      link,
      wrongPinCount: wrongPinCount ?? 0,
      isPaid,
      sections: [
        { label: "Pet basics", detail: `${pet.breed ?? ""}${pet.breed && pet.sex ? " · " : ""}${pet.sex ?? ""}`.trim() || "Name, breed, photo", status: pet.breed ? "done" : "empty", route: "/edit/pet" },
        { label: "Emergency contacts", detail: "Vet, emergency vet, backup", status: "done", route: "/edit/emergency" },
        { label: "Commands", detail: `${behavior?.commands?.length ?? 0} commands logged`, status: behavior?.commands?.length ? "done" : "empty", route: "/edit/behavior" },
        { label: "Quirks & triggers", detail: "Escape risk, fears, off-limits zones", status: "done", route: "/edit/behavior" },
        { label: "Routine", detail: isPaid ? "Shown to sitters" : "Saved — not shown to sitters yet", status: "saved", route: "/edit/routine" },
        { label: "Medical", detail: isPaid ? "Shown to sitters" : "Saved — not shown to sitters yet", status: "saved", route: "/edit/routine" },
      ],
    });
    setLoading(false);

    // Paid tier: register for push and schedule a trick-nudge if they have commands
    if (isPaid) {
      registerForPushNotifications();
      const firstCommand = behavior?.commands?.[0]?.word;
      if (firstCommand && pet.name) {
        scheduleTrickNudge(pet.name, firstCommand);
      }
    }
  };

  const rotateLink = async () => {
    Alert.alert("Rotate link?", "The current link stops working and a new one is generated.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Rotate",
        onPress: async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/rotate-link`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
              body: JSON.stringify({ pet_id: data!.pet.id }),
            }
          );
          if (res.ok) loadDashboard();
          else Alert.alert("Couldn't rotate", "Try again.");
        },
      },
    ]);
  };

  const revokeLink = async () => {
    Alert.alert("Revoke link?", "The current link will stop working immediately.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke", style: "destructive",
        onPress: async () => {
          await supabase.from("share_links").update({ revoked: true }).eq("id", data!.link.id);
          loadDashboard();
        },
      },
    ]);
  };

  const shareLink = async () => {
    if (!data?.link?.token) return;
    const url = `${WEB_URL}/p/${data.link.token}`;
    await Share.share({ message: url, url });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !data) {
    return <View className="flex-1 bg-background items-center justify-center"><Text className="text-text-muted">Loading…</Text></View>;
  }

  const { pet, link, wrongPinCount, sections, isPaid } = data;
  const shareUrl = link ? `${WEB_URL}/p/${link.token}` : null;
  const pinMsg = pinAttemptLabel(wrongPinCount);

  const statusColor = { done: colors.success, saved: colors.caution, empty: colors.border };
  const statusDot = { done: colors.success, saved: colors.caution, empty: colors.border };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 24 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 }}>
        {pet.photoUrl ? (
          <Image source={{ uri: pet.photoUrl }} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.border }} />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 24 }}>🐾</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Tanker", fontSize: 26, color: colors.textDark, lineHeight: 30 }}>
            {pet.name}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{pet.breed} · {pet.age}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/settings")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      </View>

      {/* Pet switcher — only renders if 2+ pets or paid (shows Add button) */}
      <PetSwitcher isPaid={isPaid} />

      <View style={{ paddingHorizontal: 24 }}>
      {/* Link card — dark plum surface */}
      {shareUrl && (
        <View style={{ backgroundColor: colors.cardDark, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <Eyebrow><Text style={{ color: colors.cardDarkLabel }}>Share link</Text></Eyebrow>
          <Text style={{ color: "#F8ECEE", fontSize: 12, fontFamily: "monospace", marginTop: 6, marginBottom: 12 }}>
            {shareUrl}
          </Text>

          {/* Copy stack */}
          <Text style={{ color: "rgba(248,236,238,0.5)", fontSize: 11, marginBottom: 2 }}>
            Anyone with this link can see what's on it.
          </Text>
          <Text style={{ color: "rgba(248,236,238,0.7)", fontSize: 11, marginBottom: isPaid ? 0 : 4 }}>
            The link's the door. The PIN's the key. Send them separately.
          </Text>
          {!isPaid && (
            <TouchableOpacity onPress={() => router.push("/upgrade")}>
              <Text style={{ color: "#F8ECEE", fontSize: 11, fontWeight: "600", textDecorationLine: "underline" }}>
                Routine's saved. Unlock it so sitters get the full day. →
              </Text>
            </TouchableOpacity>
          )}

          {/* PIN log */}
          {pinMsg ? (
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 11, marginTop: 8 }}>{pinMsg}</Text>
          ) : null}

          {/* Last viewed */}
          {link.lastViewedAt && (
            <Text style={{ color: "rgba(248,236,238,0.4)", fontSize: 11, marginTop: 4 }}>
              Viewed {new Date(link.lastViewedAt).toLocaleString()}
            </Text>
          )}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <TouchableOpacity
              onPress={shareLink}
              style={{ flex: 1, height: 38, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#F8ECEE", fontSize: 13, fontWeight: "600" }}>{copied ? "Copied ✓" : "Share"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setQrVisible(true)}
              style={{ height: 38, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#F8ECEE", fontSize: 13, fontWeight: "600" }}>QR</Text>
            </TouchableOpacity>
            {isPaid && (
              <TouchableOpacity
                onPress={rotateLink}
                style={{ height: 38, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#F8ECEE", fontSize: 13, fontWeight: "600" }}>Rotate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={revokeLink}
              style={{ height: 38, paddingHorizontal: 14, borderRadius: 8, backgroundColor: "rgba(184,112,112,0.2)", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600" }}>Revoke</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {shareUrl && data && (
        <QRModal
          visible={qrVisible}
          url={shareUrl}
          petName={data.pet.name}
          onClose={() => setQrVisible(false)}
        />
      )}

      {/* Profile sections */}
      <View style={{ gap: 8 }}>
        {sections.map((s) => (
          <TouchableOpacity key={s.label} onPress={() => router.push(s.route as any)}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusDot[s.status] }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: "600" }}>{s.label}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>{s.detail}</Text>
              </View>
              <Text style={{ color: colors.border, fontSize: 16 }}>›</Text>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      {/* Missing poster — JUST IN CASE */}
      <TouchableOpacity onPress={() => router.push("/poster")} style={{ marginTop: 16 }}>
        <Card>
          <Eyebrow>Just in case</Eyebrow>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Text style={{ fontFamily: "Tanker", fontSize: 20, color: colors.textDark, flex: 1 }}>
              If {pet.name} goes missing.
            </Text>
            <Text style={{ color: colors.border, fontSize: 16 }}>›</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            One tap. Everywhere it needs to be. Here if you ever need it.
          </Text>
        </Card>
      </TouchableOpacity>

      {/* Add pet — only show as a footer row on free tier (paid uses the switcher) */}
      {!isPaid && (
        <TouchableOpacity
          onPress={() => router.push("/upgrade")}
          style={{
            marginTop: 16, height: 44, borderRadius: 10, borderWidth: 1.5,
            borderColor: colors.dashedBorder, borderStyle: "dashed",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.caution, fontSize: 14 }}>
            🔒 Add another pet — unlock
          </Text>
        </TouchableOpacity>
      )}
      </View>
    </ScrollView>
  );
}
