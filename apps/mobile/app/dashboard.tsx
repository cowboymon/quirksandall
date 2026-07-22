import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Share, TextInput, Alert, Linking } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { registerForPushNotifications, scheduleTrickNudge } from "../lib/notifications";
import { Eyebrow, Card } from "../components/ui";
import PetSwitcher from "../components/PetSwitcher";
import { useActivePetStore } from "../stores/activePet";
import { colors, computeAge } from "@quirksandall/shared";
import { WEB_URL } from "../lib/config";
import { listLinks, createLink, renameLink, revokeLink, type OwnerLink } from "../lib/links";
import type { Pet } from "@quirksandall/shared";

type Section = { label: string; detail: string; status: "done" | "saved" | "empty"; route: string };
type DashboardData = {
  pet: Pet & { age: string };
  ownerInitials: string;
  links: OwnerLink[];
  firstCommand: string | null;
  sections: Section[];
  isPaid: boolean;
};

const statusColor = { done: colors.success, saved: colors.caution, empty: colors.textMuted } as const;
const statusDot = { done: colors.success, saved: colors.caution, empty: colors.border } as const;

function initialsOf(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

function viewedLabel(iso: string | null) {
  return iso ? `Viewed ${new Date(iso).toLocaleDateString()}` : "Not yet viewed";
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { petId: selectedPetId } = useActivePetStore();

  // Named-link manager UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewLink, setShowNewLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");

  useEffect(() => {
    loadDashboard();
  }, [selectedPetId]);

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth"); return; }

    const { data: ownerData } = await supabase
      .from("owners")
      .select("name, purchase_status")
      .eq("id", user.id)
      .single();

    let petQuery = supabase.from("pets").select("*").eq("owner_id", user.id).eq("status", "active");
    petQuery = selectedPetId ? petQuery.eq("id", selectedPetId) : petQuery.order("created_at").limit(1);
    const { data: pet } = await petQuery.single();
    if (!pet) { router.replace("/onboarding/step1"); return; }

    const [links, { data: behavior }] = await Promise.all([
      listLinks(pet.id),
      supabase.from("pet_behavior").select("commands").eq("pet_id", pet.id).single(),
    ]);

    const isPaid = ownerData?.purchase_status === "paid";
    const commandCount = behavior?.commands?.length ?? 0;

    setData({
      pet: { ...pet, age: computeAge(pet.dob, pet.dob_is_estimated) },
      ownerInitials: initialsOf(ownerData?.name),
      links,
      firstCommand: behavior?.commands?.[0]?.word ?? null,
      isPaid,
      sections: [
        { label: "Pet basics", detail: `${pet.breed ?? ""}${pet.breed && pet.sex ? " · " : ""}${pet.sex ?? ""}`.trim() || "Name, breed, photo", status: pet.breed ? "done" : "empty", route: "/edit/pet" },
        { label: "Emergency contacts", detail: "Vet, emergency vet, backup", status: "done", route: "/edit/emergency" },
        { label: "Commands", detail: `${commandCount} commands logged`, status: commandCount ? "done" : "empty", route: "/edit/behavior" },
        { label: "Quirks & triggers", detail: "Escape risk, fears, off-limits zones", status: "done", route: "/edit/behavior" },
        { label: "Routine", detail: isPaid ? "Shown to sitters" : "Saved — not shown to sitters yet", status: "saved", route: "/edit/routine" },
        { label: "Medical", detail: isPaid ? "Shown to sitters" : "Saved — not shown to sitters yet", status: "saved", route: "/edit/routine" },
      ],
    });
    setLoading(false);

    if (isPaid) {
      registerForPushNotifications();
      if (behavior?.commands?.[0]?.word && pet.name) scheduleTrickNudge(pet.name, behavior.commands[0].word);
    }
  };

  const shareLinkUrl = async (link: OwnerLink) => {
    const url = `${WEB_URL}/p/${link.token}`;
    await Share.share({ message: url, url });
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 2000);
  };

  const commitRename = async (link: OwnerLink) => {
    const name = renameValue.trim();
    if (name && name !== link.label) await renameLink(link.id, name);
    setRenamingId(null);
    loadDashboard();
  };

  const confirmRevoke = (link: OwnerLink) => {
    Alert.alert("Revoke this link?", "It stops working immediately for anyone who has it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Revoke", style: "destructive", onPress: async () => { await revokeLink(link.id); loadDashboard(); } },
    ]);
  };

  const handleAddLink = async () => {
    const name = newLinkName.trim();
    if (!name || !data) return;
    await createLink(data.pet.id, name);
    setNewLinkName("");
    setShowNewLink(false);
    loadDashboard();
  };

  const preview = () => {
    if (data?.links[0]) Linking.openURL(`${WEB_URL}/p/${data.links[0].token}`);
  };

  if (loading || !data) {
    return <View className="flex-1 bg-background items-center justify-center"><Text className="text-text-muted">Loading…</Text></View>;
  }

  const { pet, ownerInitials, links, firstCommand, sections, isPaid } = data;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top bar — label + owner avatar */}
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow>Dashboard</Eyebrow>
        <TouchableOpacity
          onPress={() => router.push("/account")}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardDark, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: colors.cardDarkText, fontSize: 11, fontFamily: "Satoshi-Bold" }}>{ownerInitials}</Text>
        </TouchableOpacity>
      </View>

      <PetSwitcher isPaid={isPaid} />

      <View style={{ paddingHorizontal: 24, gap: 16 }}>
        {/* Named share links */}
        <View style={{ backgroundColor: colors.cardDark, borderRadius: 12, overflow: "hidden" }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow ochre>Share links</Eyebrow>
              <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, marginTop: 6, lineHeight: 17, fontFamily: "Satoshi-Light" }}>
                Each link is unique. Name it by who you're sending it to — sitter, family, vet, anyone.
              </Text>
            </View>
            {links.length > 0 && (
              <TouchableOpacity onPress={preview} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)" }}>
                <Ionicons name="eye-outline" size={14} color="rgba(248,236,238,0.8)" />
                <Text style={{ color: "rgba(248,236,238,0.8)", fontSize: 12, fontFamily: "Satoshi-Medium" }}>Preview</Text>
              </TouchableOpacity>
            )}
          </View>

          {links.map((link, i) => (
            <View
              key={link.id}
              style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: "rgba(248,236,238,0.1)" }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="link-outline" size={15} color={colors.cardDarkLabel} />
              </View>
              <View style={{ flex: 1 }}>
                {renamingId === link.id ? (
                  <TextInput
                    autoFocus
                    value={renameValue}
                    onChangeText={setRenameValue}
                    onBlur={() => commitRename(link)}
                    onSubmitEditing={() => commitRename(link)}
                    style={{ color: colors.cardDarkText, fontSize: 13, fontFamily: "Satoshi-Medium", borderBottomWidth: 1, borderBottomColor: "rgba(248,236,238,0.3)", paddingBottom: 2 }}
                  />
                ) : (
                  <TouchableOpacity onPress={() => { setRenamingId(link.id); setRenameValue(link.label ?? ""); }} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={{ color: colors.cardDarkText, fontSize: 13, fontFamily: "Satoshi-Medium" }} numberOfLines={1}>
                      {link.label || "Untitled link"}
                    </Text>
                    <Ionicons name="pencil" size={11} color="rgba(248,236,238,0.4)" />
                  </TouchableOpacity>
                )}
                <Text style={{ color: "rgba(248,236,238,0.4)", fontSize: 11, marginTop: 2, fontFamily: "Satoshi-Light" }}>
                  {viewedLabel(link.last_viewed_at)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => shareLinkUrl(link)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={copiedId === link.id ? "checkmark" : "share-outline"} size={15} color={copiedId === link.id ? colors.success : colors.cardDarkText} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmRevoke(link)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={15} color="rgba(248,236,238,0.5)" />
              </TouchableOpacity>
            </View>
          ))}

          {/* New link */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(248,236,238,0.1)" }}>
            {showNewLink ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  autoFocus
                  value={newLinkName}
                  onChangeText={setNewLinkName}
                  onSubmitEditing={handleAddLink}
                  placeholder="Who's this for?"
                  placeholderTextColor="rgba(248,236,238,0.3)"
                  style={{ flex: 1, height: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", color: colors.cardDarkText, fontSize: 13, fontFamily: "Satoshi" }}
                />
                <TouchableOpacity onPress={handleAddLink} disabled={!newLinkName.trim()} style={{ height: 36, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.cardDarkText, alignItems: "center", justifyContent: "center", opacity: newLinkName.trim() ? 1 : 0.4 }}>
                  <Text style={{ color: colors.cardDark, fontSize: 13, fontFamily: "Satoshi-Bold" }}>Create</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowNewLink(false); setNewLinkName(""); }} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="close" size={15} color="rgba(248,236,238,0.6)" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowNewLink(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "rgba(240,160,176,0.5)", borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="add" size={13} color={colors.cardDarkLabel} />
                </View>
                <Text style={{ color: colors.cardDarkLabel, fontSize: 13, fontFamily: "Satoshi-Medium" }}>New link</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Link disclosure + upgrade nudge */}
        <View style={{ paddingHorizontal: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Satoshi-Light" }}>
            The link's the door. The PIN's the key. Send them separately.
          </Text>
          {!isPaid && (
            <TouchableOpacity onPress={() => router.push("/upgrade")} style={{ marginTop: 4 }}>
              <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "Satoshi-Medium" }}>
                Routine's saved. Unlock it so sitters get the full day. →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nudge card */}
        {firstCommand && (
          <Card style={{ borderColor: "rgba(184,58,82,0.4)", flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(184,58,82,0.15)", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <Ionicons name="notifications-outline" size={15} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium", lineHeight: 19 }}>
                Still using "{firstCommand}" with {pet.name}? Still accurate?
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3, fontFamily: "Satoshi-Light" }}>Commands drift. Worth a check.</Text>
              <TouchableOpacity onPress={() => router.push("/edit/behavior")} style={{ marginTop: 6 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium" }}>Check them →</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Profile sections */}
        <View>
          <Eyebrow>Profile sections</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            {sections.map((s) => (
              <TouchableOpacity key={s.label} onPress={() => router.push(s.route as any)}>
                <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusDot[s.status] }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>{s.label}</Text>
                    <Text style={{ color: statusColor[s.status], fontSize: 11, marginTop: 2 }}>{s.detail}</Text>
                  </View>
                  <Ionicons name="pencil" size={14} color={colors.dashedBorder} />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Missing poster — rose banner */}
        <TouchableOpacity
          onPress={() => router.push("/poster")}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 16 }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(248,236,238,0.15)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="alert-circle-outline" size={18} color="rgba(248,236,238,0.85)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Medium" }}>If {pet.name} goes missing</Text>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 11, marginTop: 2, fontFamily: "Satoshi-Light" }}>
              One tap. Everywhere it needs to be. Here if you ever need it.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(248,236,238,0.5)" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
