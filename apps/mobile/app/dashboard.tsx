import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Share, TextInput, Alert, Platform, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";

// "Pencil line" edit icon (Lucide-style) as an inline SVG so we control the
// stroke weight — font icons (Ionicons/Feather) bake theirs in. Bump strokeWidth
// for a thicker, more proportional look.
function PencilLine({ size = 14, color = "#000000", strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}
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
  needsReview: boolean;
  sections: Section[];
  isPaid: boolean;
};

const REVIEW_INTERVAL_MS = 21 * 24 * 60 * 60 * 1000; // 21 days

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
  const { petId: selectedPetId, setCachedPet } = useActivePetStore();

  // Named-link manager UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewLink, setShowNewLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [deletionScheduled, setDeletionScheduled] = useState(false);

  // Reload every time the dashboard regains focus (e.g. returning from an edit
  // screen) so counts/status reflect the latest saves — not just on pet switch.
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [selectedPetId])
  );

  const loadDashboard = async () => {
    const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
    if (!user) { router.replace("/auth"); return; }

    const { data: ownerData } = await supabase
      .from("owners")
      .select("name, purchase_status")
      .eq("id", user.id)
      .single();

    // Resolve the selected pet; if that id no longer maps to an active pet
    // (stale selection, deleted pet, freshly added pet), fall back to the
    // earliest active pet. Only send the owner to onboarding when they truly
    // have no active pets.
    let pet: any = null;
    if (selectedPetId) {
      const { data } = await supabase
        .from("pets").select("*").eq("owner_id", user.id).eq("status", "active").eq("id", selectedPetId).maybeSingle();
      pet = data;
    }
    if (!pet) {
      const { data } = await supabase
        .from("pets").select("*").eq("owner_id", user.id).eq("status", "active").order("created_at").limit(1).maybeSingle();
      pet = data;
    }
    // New user with no pets → start onboarding at the owner-details step.
    if (!pet) { router.replace("/onboarding/owner"); return; }

    // Seed the shared cache so edit screens render the pet instantly instead of
    // blocking on their own round-trip.
    setCachedPet(pet);

    const [links, { data: behavior }] = await Promise.all([
      listLinks(pet.id),
      supabase.from("pet_behavior").select("commands").eq("pet_id", pet.id).single(),
    ]);

    const isPaid = ownerData?.purchase_status === "paid";
    const commandCount = behavior?.commands?.length ?? 0;
    // 21-day freshness cadence (#54): the nudge reappears when no command has
    // been confirmed (i.e. the behavior screen saved) within the window.
    const lastConfirmed = (behavior?.commands ?? [])
      .map((c: any) => c.lastConfirmedAt).filter(Boolean).sort().pop() as string | undefined;
    const needsReview = commandCount > 0 && (!lastConfirmed || Date.now() - new Date(lastConfirmed).getTime() > REVIEW_INTERVAL_MS);

    setData({
      pet: { ...pet, age: computeAge(pet.dob, pet.dob_is_estimated) },
      ownerInitials: initialsOf(ownerData?.name),
      links,
      firstCommand: behavior?.commands?.[0]?.word ?? null,
      needsReview,
      isPaid,
      sections: [
        { label: "Pet Basics", detail: `${pet.breed ?? ""}${pet.breed && pet.sex ? " · " : ""}${pet.sex ?? ""}`.trim() || "Name, breed, photo", status: pet.breed ? "done" : "empty", route: "/edit/pet" },
        { label: "In an Emergency", detail: "Vet, emergency vet, emergency contacts", status: "done", route: "/edit/emergency" },
        { label: "Commands", detail: commandCount ? `${commandCount} command${commandCount === 1 ? "" : "s"} saved` : "None saved yet", status: commandCount ? "done" : "empty", route: "/edit/behavior" },
        { label: "Quirks & Triggers", detail: "Escape risk, fears, off-limits zones", status: "done", route: "/edit/behavior?section=quirks" },
        { label: "Routine", detail: isPaid ? "Shown to sitters" : "Saved — not shown to sitters yet", status: "saved", route: "/edit/routine" },
        { label: "Medical", detail: isPaid ? "Shown to sitters" : "Saved — not shown to sitters yet", status: "saved", route: "/edit/routine?section=medical" },
      ],
    });
    setLoading(false);

    // Defensive: the deletion column may not be present until the migration
    // lands, so a missing column must not break the dashboard.
    const { data: delRow } = await supabase
      .from("owners").select("deletion_scheduled_at").eq("id", user.id).single();
    setDeletionScheduled(!!(delRow as any)?.deletion_scheduled_at);

    if (isPaid) {
      registerForPushNotifications();
      if (behavior?.commands?.[0]?.word && pet.name) scheduleTrickNudge(pet.name, behavior.commands[0].word);
    }
  };

  const shareLinkUrl = async (link: OwnerLink) => {
    const url = `${WEB_URL}/p/${link.token}`;
    // Pass ONE representation of the link. Sending both `message` and `url`
    // makes iOS surface the link twice in the share sheet (#41). iOS prefers a
    // real `url` (rich preview); Android only reads `message`.
    await Share.share(Platform.OS === "ios" ? { url } : { message: url });
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
      { text: "Revoke", style: "destructive", onPress: async () => {
        const { error } = await revokeLink(link.id);
        if (error) { Alert.alert("Couldn't revoke", error); return; }
        loadDashboard();
      } },
    ]);
  };

  const cancelDeletion = async () => {
    const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
    if (user) await supabase.from("owners").update({ deletion_scheduled_at: null }).eq("id", user.id);
    setDeletionScheduled(false);
  };

  const handleAddLink = async () => {
    const name = newLinkName.trim();
    // Guard against the double-tap that was creating duplicate "New link" rows:
    // once a create is in flight, ignore further taps until it resolves.
    if (!name || !data || creatingLink) return;
    setCreatingLink(true);
    try {
      await createLink(data.pet.id, name);
      setNewLinkName("");
      setShowNewLink(false);
      await loadDashboard();
    } finally {
      setCreatingLink(false);
    }
  };

  const preview = () => {
    // Native in-app preview of the recipient cheat sheet — no browser chrome,
    // no duplicate share buttons. Shows the full picture for the active pet.
    router.push("/preview");
  };

  if (loading || !data) {
    return <View className="flex-1 bg-background items-center justify-center"><Text className="text-text-muted">Loading…</Text></View>;
  }

  const { pet, ownerInitials, links, firstCommand, needsReview, sections, isPaid } = data;

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

      {deletionScheduled && (
        <View style={{ marginHorizontal: 24, marginBottom: 4, backgroundColor: colors.cardDark, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.cardDarkLabel} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.cardDarkText, fontSize: 13, fontFamily: "Satoshi-Medium" }}>Account scheduled for deletion</Text>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 11, marginTop: 2, fontFamily: "Satoshi-Light" }}>Deleted after 30 days unless you cancel.</Text>
          </View>
          <TouchableOpacity onPress={cancelDeletion} style={{ height: 32, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.cardDarkText, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.cardDark, fontSize: 12, fontFamily: "Satoshi-Bold" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

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
                    // No underline / extra padding — it changed the row height vs the
                    // plain label and jumped the text up when entering edit mode.
                    style={{ color: colors.cardDarkText, fontSize: 13, fontFamily: "Satoshi-Medium", padding: 0 }}
                  />
                ) : (
                  <Text style={{ color: colors.cardDarkText, fontSize: 13, fontFamily: "Satoshi-Medium" }} numberOfLines={1}>
                    {link.label || "Untitled link"}
                  </Text>
                )}
                <Text style={{ color: "rgba(248,236,238,0.4)", fontSize: 11, marginTop: 2, fontFamily: "Satoshi-Light" }}>
                  {viewedLabel(link.last_viewed_at)}
                </Text>
              </View>
              {/* Action row, left→right: Edit → Share → Delete (#71). Edit is a
                  standalone button (renames inline) rather than a pencil hung off
                  the link name. */}
              <TouchableOpacity
                onPress={() => { setRenamingId(link.id); setRenameValue(link.label ?? ""); }}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}
              >
                <PencilLine size={15} color={colors.cardDarkText} strokeWidth={2.25} />
              </TouchableOpacity>
              {/* The first (main) link is always shareable — free tier gets
                  preview + link 1. Only additional links need the paid unlock. */}
              {(() => {
                const linkLocked = !isPaid && i > 0;
                return (
                  <TouchableOpacity
                    onPress={() => (linkLocked ? router.push("/upgrade") : shareLinkUrl(link))}
                    style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons
                      name={linkLocked ? "lock-closed" : copiedId === link.id ? "checkmark" : "share-outline"}
                      size={15}
                      color={linkLocked ? "rgba(248,236,238,0.4)" : copiedId === link.id ? colors.success : colors.cardDarkText}
                    />
                  </TouchableOpacity>
                );
              })()}
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
                <TouchableOpacity onPress={handleAddLink} disabled={!newLinkName.trim() || creatingLink} style={{ height: 36, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.cardDarkText, alignItems: "center", justifyContent: "center", minWidth: 74, opacity: newLinkName.trim() && !creatingLink ? 1 : 0.4 }}>
                  {creatingLink ? (
                    <ActivityIndicator size="small" color={colors.cardDark} />
                  ) : (
                    <Text style={{ color: colors.cardDark, fontSize: 13, fontFamily: "Satoshi-Bold" }}>Create</Text>
                  )}
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

        {/* Upgrade nudge — soft card with lock chip */}
        {!isPaid && (
          <TouchableOpacity onPress={() => router.push("/upgrade")} activeOpacity={0.85}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.secondary, borderWidth: 1, borderColor: "rgba(184,58,82,0.25)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(184,58,82,0.15)", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium", lineHeight: 19 }}>
                  Routine &amp; medical are saved, not shared yet.
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3, fontFamily: "Satoshi-Light" }}>
                  Unlock so sitters get {pet.name}'s full day — $7.99, once.
                </Text>
                <Text style={{ color: colors.primary, fontSize: 12, marginTop: 6, fontFamily: "Satoshi-Medium" }}>Unlock full access →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Command freshness nudge — 21-day cadence, dismissible for the session */}
        {firstCommand && needsReview && !nudgeDismissed && (
          <Card style={{ borderColor: "rgba(184,58,82,0.4)", flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(184,58,82,0.15)", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <Ionicons name="notifications-outline" size={15} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium", lineHeight: 19 }}>
                "{firstCommand}" — does {pet.name}'s stand-in know what that means?
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3, fontFamily: "Satoshi-Light" }}>Worth a look before the next handoff.</Text>
              <TouchableOpacity onPress={() => router.push("/edit/behavior")} style={{ marginTop: 6 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium" }}>Check them →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setNudgeDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Profile sections */}
        <View>
          <Eyebrow>Profile sections</Eyebrow>
          <View style={{ gap: 8, marginTop: 12 }}>
            {sections.map((s) => (
              <View key={s.label}>
                <TouchableOpacity onPress={() => router.push(s.route as any)}>
                  <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusDot[s.status] }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>{s.label}</Text>
                      <Text style={{ color: statusColor[s.status], fontSize: 11, marginTop: 2 }}>{s.detail}</Text>
                    </View>
                    <Ionicons name="create-outline" size={16} color={colors.textMuted} />
                  </Card>
                </TouchableOpacity>
                {/* Quick access to the PIN, directly under the emergency row */}
                {s.label === "In an Emergency" && (
                  <TouchableOpacity
                    onPress={() => router.push("/edit/emergency?section=pin")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 6, marginLeft: 20, paddingVertical: 4 }}
                  >
                    <Ionicons name="key-outline" size={13} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium" }}>Change PIN →</Text>
                  </TouchableOpacity>
                )}
              </View>
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
            <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Medium" }}>If {pet.name} ever goes missing —</Text>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 11, marginTop: 2, fontFamily: "Satoshi-Light" }}>
              One tap. Something to share, something to print. Free, always. Here if you ever need it.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(248,236,238,0.5)" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
