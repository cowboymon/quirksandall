import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, View, Text, ScrollView, TouchableOpacity, Share, TextInput, Platform, ActivityIndicator } from "react-native";
import { AirplaneTilt, Bell, CaretDown, CaretRight, CaretUp, Check, Eye, Key, LinkSimple, LockSimple, PencilSimpleLine, Plus, ShareFat, Trash, WarningCircle, X } from "../components/icons";
import { AppAlert } from "../stores/appAlert";
import { recordShareAndMaybeAskForReview } from "../lib/reviewPrompt";
import { router, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../lib/supabase";
import { Eyebrow, Card } from "../components/ui";
import PetSwitcher from "../components/PetSwitcher";
import ConfirmModal from "../components/ConfirmModal";
import DurationModal from "../components/DurationModal";
import LinkActionsSheet from "../components/LinkActionsSheet";
import { Skeleton } from "../components/Skeleton";
import { useActivePetStore } from "../stores/activePet";
import { colors, computeAge, capitalizeFirst, orderedCommands, possessive, stayPhrase, isUnlocked } from "@quirksandall/shared";
import { usePrices } from "../hooks/usePrices";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { recallPin } from "../lib/pinVault";
import { identifyPurchaser } from "../lib/purchases";
import { firstShareMessage, pinMessage } from "../lib/shareMessage";
import { WEB_URL } from "../lib/config";
import { listLinks, createLink, renameLink, revokeLink, setLinkDuration, markLinkShared, type OwnerLink } from "../lib/links";
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
// Past this many links the panel starts dominating the dashboard.
const LINKS_COLLAPSED_COUNT = 3;
// Free tier: one shareable link, plus one more you can create so the "share
// several links" feature is visibly there rather than hidden until payment —
// same reasoning as leaving the "+ New link" affordance itself always
// visible. A third creation attempt is where the free tier actually stops;
// paid has no cap.
const FREE_LINK_LIMIT = 2;

const statusColor = { done: colors.success, saved: colors.caution, empty: colors.textMuted } as const;
const statusDot = { done: colors.success, saved: colors.caution, empty: colors.border } as const;

function initialsOf(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

// The one line under a link's name. The count is what owners actually asked
// for ("has the sitter looked at it?"), the date is what makes it meaningful,
// so they share a line rather than competing for two. Views, not visitors —
// recipients aren't identified, and a re-read counts again.
//
// It has to be SHORT. This sits in a flex:1 column beside an avatar and three
// action buttons — roughly 180pt at 11px — so the prose form ("Viewed 5 times
// · last 11/08/2026") wrapped to a second line and pushed the row out of
// alignment. Hence "5 views · 11/08": the same bare DD/MM the stay label
// directly below it uses. The year only appears when the view wasn't this
// year, where dropping it would actively mislead.
function viewedLabel(iso: string | null, count?: number | null) {
  if (!iso) return "Not yet viewed";
  const d = new Date(iso);
  const dm = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const when = d.getFullYear() === new Date().getFullYear()
    ? dm
    : `${dm}/${String(d.getFullYear()).slice(-2)}`;
  const n = count ?? 0;
  // A row with a last-viewed date but no counter predates the counter column,
  // so show the date alone rather than claiming zero views.
  return n > 0 ? `${n} ${n === 1 ? "view" : "views"} · ${when}` : `Viewed ${when}`;
}

export default function Dashboard() {
  useRequireAuth();
  const prices = usePrices();
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
  const [revokeTarget, setRevokeTarget] = useState<OwnerLink | null>(null);
  const [durationTarget, setDurationTarget] = useState<OwnerLink | null>(null);
  const [actionsTarget, setActionsTarget] = useState<OwnerLink | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [deletionScheduled, setDeletionScheduled] = useState(false);
  // The PIN this device remembers for the active pet, shown inline on each
  // PIN-gated link rather than offered once in a modal. null = not on this
  // device (reinstall, second device), in which case the row invites setting
  // it rather than pretending to know it.
  const [petPin, setPetPin] = useState<string | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [showTripNudge, setShowTripNudge] = useState(false);
  const [showAllLinks, setShowAllLinks] = useState(false);
  // Once the pet switcher scrolls away there's nothing on screen saying
  // whose profile this is — the pinned bar picks the name up, the same way
  // an iOS nav bar takes over a large title once it scrolls out.
  const [scrolledPastSwitcher, setScrolledPastSwitcher] = useState(false);
  // Fade + small rise on the name, so it settles into the bar rather than
  // popping at the scroll threshold.
  const nameAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(nameAnim, {
      toValue: scrolledPastSwitcher ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [scrolledPastSwitcher]);

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
    // Tie the RevenueCat customer to this user so purchases and webhook
    // events carry the Supabase id, not an anonymous one. Guarded internally,
    // so calling it on every dashboard load is one no-op after the first.
    identifyPurchaser(user.id);

    const { data: ownerData } = await supabase
      .from("owners")
      .select("name, purchase_status, expires_at, backup_contacts")
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

    const [links, { data: behavior }, docCountRes, { data: vetInfo }, { data: routine }, { data: medical }] = await Promise.all([
      listLinks(pet.id),
      supabase.from("pet_behavior").select("commands, scared, no_go, flight_risk, temperament_summary").eq("pet_id", pet.id).maybeSingle(),
      // Defensive: pet_documents may not exist until its migration is applied —
      // a missing table returns an error (not a throw), so count falls back to 0.
      supabase.from("pet_documents").select("id", { count: "exact", head: true }).eq("pet_id", pet.id),
      supabase.from("pet_vet_info").select("primary_vet, emergency_vet, insurance").eq("pet_id", pet.id).maybeSingle(),
      supabase.from("pet_routine").select("feeding, walks, sleep, bathroom_habits").eq("pet_id", pet.id).maybeSingle(),
      supabase.from("pet_medical").select("allergies, conditions, medications").eq("pet_id", pet.id).maybeSingle(),
    ]);
    const docCount = docCountRes.count ?? 0;

    // "Filled" for dot purposes: any non-blank text anywhere in the value —
    // nested objects/arrays included, so a feeding jsonb with one meal time
    // counts and an object of empty strings doesn't.
    const hasContent = (v: any): boolean => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.some(hasContent);
      if (typeof v === "object") return Object.values(v).some(hasContent);
      return true; // numbers/booleans are content
    };
    const emergencyFilled = hasContent([vetInfo?.primary_vet, vetInfo?.emergency_vet, vetInfo?.insurance, ownerData?.backup_contacts]);
    const quirksFilled = hasContent([behavior?.scared, behavior?.no_go, behavior?.flight_risk, behavior?.temperament_summary]);
    const routineFilled = hasContent([routine?.feeding, routine?.walks, routine?.sleep, routine?.bathroom_habits]);
    const medicalFilled = hasContent([medical?.allergies, medical?.conditions, medical?.medications]);
    const basicsFilled = hasContent([pet.breed, pet.sex, pet.dob, pet.weight, pet.photo_url]);

    const isPaid = isUnlocked(ownerData);
    // Same visible/ordered list a recipient sees (manual order, hidden
    // withheld for paid) so the dashboard count/preview never disagree.
    const visibleCommands = orderedCommands((behavior?.commands ?? []) as any[], isPaid, false);
    const commandCount = visibleCommands.length;
    // 21-day freshness cadence (#54): the nudge reappears when no command has
    // been confirmed (i.e. the behavior screen saved) within the window.
    const lastConfirmed = (behavior?.commands ?? [])
      .map((c: any) => c.lastConfirmedAt).filter(Boolean).sort().pop() as string | undefined;
    const needsReview = commandCount > 0 && (!lastConfirmed || Date.now() - new Date(lastConfirmed).getTime() > REVIEW_INTERVAL_MS);

    setData({
      pet: { ...pet, age: computeAge(pet.dob, pet.dob_is_estimated) },
      ownerInitials: initialsOf(ownerData?.name),
      links,
      firstCommand: visibleCommands[0]?.word ?? null,
      needsReview,
      isPaid,
      // One dot, one meaning: green = something's filled in, grey = nothing
      // yet. Amber is reserved for the single genuine mismatch — routine
      // content a free account's sitters can't see. Free-vs-paid otherwise
      // lives in words (detail text, lock callouts), never in the dot.
      sections: [
        { label: "Pet Basics", detail: `${pet.breed ?? ""}${pet.breed && pet.sex ? " · " : ""}${pet.sex ?? ""}`.trim() || "Name, breed, photo", status: basicsFilled ? "done" : "empty", route: "/edit/pet" },
        { label: "In an Emergency", detail: "Vet, emergency vet, emergency contacts", status: emergencyFilled ? "done" : "empty", route: "/edit/emergency" },
        { label: "Commands", detail: commandCount ? `${commandCount} command${commandCount === 1 ? "" : "s"} saved` : "None saved yet", status: commandCount ? "done" : "empty", route: "/edit/behavior" },
        { label: "Quirks & Triggers", detail: "Escape risk, fears, off-limits zones", status: quirksFilled ? "done" : "empty", route: "/edit/behavior?section=quirks" },
        {
          label: "Routine",
          detail: !routineFilled ? "Feeding, walks, sleep" : isPaid ? "Shown to sitters" : "Saved — not shown to sitters yet",
          status: !routineFilled ? "empty" : isPaid ? "done" : "saved",
          route: "/edit/routine",
        },
        { label: "Medical", detail: medicalFilled ? "Shown to sitters" : "Allergies, meds, conditions", status: medicalFilled ? "done" : "empty", route: "/edit/routine?section=medical" },
        { label: "Documents Vault", detail: docCount ? `${docCount} file${docCount === 1 ? "" : "s"}` : "Vaccinations, flea & worm", status: docCount ? "done" : "empty", route: "/edit/documents" },
      ],
    });
    setLoading(false);
    loadTripNudge(links);
    recallPin(pet.id).then(setPetPin);

    // Defensive: the deletion column may not be present until the migration
    // lands, so a missing column must not break the dashboard.
    const { data: delRow } = await supabase
      .from("owners").select("deletion_scheduled_at").eq("id", user.id).single();
    setDeletionScheduled(!!(delRow as any)?.deletion_scheduled_at);

    // Notifications (push + the local freshness nudge) are a v1.1 feature —
    // deliberately not wired in v1 so there's no notification-permission prompt
    // and no APNs dependency. The lib stays in place for 1.1.
  };

  const shareLinkUrl = async (link: OwnerLink) => {
    const doShare = async () => {
      const url = `${WEB_URL}/p/${link.token}`;
      const firstSend = !link.first_shared_at;
      const pinSet = !!link.pin_hash;

      if (firstSend) {
        // First time this link goes out, the sitter has no idea what it is, so
        // send the explanation with it. The URL lives inside the message —
        // passing both `message` and `url` makes iOS show the link twice (#41),
        // so this trades the rich preview for context, which is the better deal
        // on the one send where context is missing.
        const res = await Share.share({ message: firstShareMessage(data?.pet.name ?? "", url, pinSet) });
        await markLinkShared(link.id);
        if (res.action === Share.sharedAction) recordShareAndMaybeAskForReview();
      } else {
        // Repeat sends go bare — the sitter already knows. Pass ONE
        // representation (#41); iOS prefers a real `url` for the rich preview,
        // Android only reads `message`.
        const res = await Share.share(Platform.OS === "ios" ? { url } : { message: url });
        // Ask for a rating only off a genuinely completed send — a dismissed
        // sheet is not a value moment.
        if (res.action === Share.sharedAction) recordShareAndMaybeAskForReview();
      }

      setCopiedId(link.id);
      setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 2000);

      loadDashboard();
    };
    await doShare();
  };

  const commitRename = async (link: OwnerLink) => {
    const name = renameValue.trim();
    if (name && name !== link.label) await renameLink(link.id, name);
    setRenamingId(null);
    loadDashboard();
  };

  // Owner-side only, never shown to a sitter. Surfaced as a dismissable card
  // rather than a modal at share time: interrupting the share was the wrong
  // moment (the owner is mid-task, and the thing being asked for happens
  // outside the app anyway). A trip is the real trigger, and setting a stay
  // duration is the closest thing to declaring one.
  //
  // Still throttled to 30 days — telling the vet twice in a fortnight helps
  // nobody — and still only when a decision contact exists to tell them about.
  const NUDGE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
  const loadTripNudge = async (links: OwnerLink[]) => {
    const onATrip = links.some((l) => l.duration_preset || l.ends_at || l.starts_at);
    if (!onATrip) { setShowTripNudge(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;
    const { data: owner } = await supabase
      .from("owners")
      .select("backup_contacts, decision_contact_nudge_shown_at")
      .eq("id", user.id)
      .single();
    const hasDecisionContact = (owner?.backup_contacts ?? []).some((c: any) => c.is_decision_contact);
    if (!hasDecisionContact) { setShowTripNudge(false); return; }
    const lastShown = owner?.decision_contact_nudge_shown_at ? new Date(owner.decision_contact_nudge_shown_at).getTime() : 0;
    setShowTripNudge(Date.now() - lastShown >= NUDGE_INTERVAL_MS);
  };

  // Dismissing counts as shown: the 30-day clock starts here, so it doesn't
  // reappear on the next dashboard load.
  const dismissTripNudge = async () => {
    setShowTripNudge(false);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;
    await supabase.from("owners")
      .update({ decision_contact_nudge_shown_at: new Date().toISOString() })
      .eq("id", user.id);
  };

  const doRevoke = async () => {
    const link = revokeTarget;
    setRevokeTarget(null);
    if (!link) return;
    // Optimistic: the link disappears from the list immediately (listLinks
    // only returns non-revoked links), and rolls back if the write fails.
    const prevLinks = data?.links ?? null;
    setData((d) => (d ? { ...d, links: d.links.filter((l) => l.id !== link.id) } : d));
    const { error } = await revokeLink(link.id);
    if (error) {
      setData((d) => (d && prevLinks ? { ...d, links: prevLinks } : d));
      AppAlert.alert("Couldn't revoke", error);
      return;
    }
    loadDashboard();
  };

  const cancelDeletion = async () => {
    // Optimistic: hide the deletion banner right away, restore it if the
    // write fails.
    setDeletionScheduled(false);
    const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
    if (!user) return;
    const { error } = await supabase.from("owners").update({ deletion_scheduled_at: null }).eq("id", user.id);
    if (error) {
      setDeletionScheduled(true);
      AppAlert.alert("Couldn't cancel deletion", error.message);
    }
  };

  const handleAddLink = async () => {
    const name = newLinkName.trim();
    // Guard against the double-tap that was creating duplicate "New link" rows:
    // once a create is in flight, ignore further taps until it resolves.
    if (!name || !data || creatingLink) return;
    setCreatingLink(true);
    setNewLinkName("");
    setShowNewLink(false);
    // Optimistic: show the new link immediately with a temporary id, then
    // reconcile with the real row (or roll back on failure).
    const tempId = `temp-${Date.now()}`;
    const optimisticLink: OwnerLink = {
      id: tempId, token: "", label: name, revoked: false, last_viewed_at: null, view_count: 0,
      created_at: new Date().toISOString(), pin_hash: null, duration_preset: null, starts_at: null, ends_at: null, first_shared_at: null,
    };
    setData((d) => (d ? { ...d, links: [...d.links, optimisticLink] } : d));
    try {
      const created = await createLink(data.pet.id, name);
      if (!created) {
        setData((d) => (d ? { ...d, links: d.links.filter((l) => l.id !== tempId) } : d));
        AppAlert.alert("Couldn't create link", "Please try again.");
        return;
      }
      setData((d) => (d ? { ...d, links: d.links.map((l) => (l.id === tempId ? created : l)) } : d));
      loadDashboard();
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
    // Skeleton mirroring the real layout (top bar, switcher, cards) — reads
    // as "loading" where a bare spinner or blank screen reads as "stuck".
    return (
      <View className="flex-1 bg-background">
        <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Skeleton style={{ width: 80, height: 12, borderRadius: 6 }} />
          <Skeleton style={{ width: 34, height: 34, borderRadius: 17 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 24, marginTop: 8 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ))}
        </View>
        <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 12 }}>
          <Skeleton style={{ height: 150, borderRadius: 12 }} />
          <Skeleton style={{ height: 90, borderRadius: 12 }} />
          <Skeleton style={{ height: 240, borderRadius: 12 }} />
        </View>
      </View>
    );
  }

  const { pet, ownerInitials, links, firstCommand, needsReview, sections, isPaid } = data;
  const visibleLinks = showAllLinks ? links : links.slice(0, LINKS_COLLAPSED_COUNT);

  return (
    <View style={{ flex: 1 }}>
    {/* Top bar — label + owner avatar. Outside the ScrollView so it stays
        put while the page scrolls; the account avatar is the only way off
        this screen, so it shouldn't scroll out of reach. */}
    <View style={{ backgroundColor: colors.background, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      {/* Fixed-height wrapper matching the avatar, so the label is
          dead-centre against the circle regardless of the text's own line
          metrics — it was sitting in line with the circle's top. */}
      <View style={{ height: 34, justifyContent: "center" }}>
        <Eyebrow>Dashboard</Eyebrow>
      </View>
      {/* Centered over the row, not in flex flow, so it can't shove the
          label or avatar around when it appears. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", left: 0, right: 0, top: 56, bottom: 12,
          alignItems: "center", justifyContent: "center",
          opacity: nameAnim,
          transform: [{ translateY: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        }}
      >
        <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Bold" }} numberOfLines={1}>
          {pet.name}
        </Text>
      </Animated.View>
      <TouchableOpacity
        onPress={() => router.push("/account")}
        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardDark, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: colors.cardDarkText, fontSize: 11, fontFamily: "Satoshi-Bold" }}>{ownerInitials}</Text>
      </TouchableOpacity>
    </View>
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      // Fires often enough to feel immediate without tracking every frame.
      scrollEventThrottle={32}
      onScroll={(e) => setScrolledPastSwitcher(e.nativeEvent.contentOffset.y > 120)}
    >
      <PetSwitcher isPaid={isPaid} />

      {deletionScheduled && (
        <View style={{ marginHorizontal: 24, marginBottom: 4, backgroundColor: colors.cardDark, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <WarningCircle size={18} color={colors.cardDarkLabel} />
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
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
            {/* Not <Eyebrow ochre> here: that rose (#B83A52) is 2.79:1 on
                this maroon — below even the 3:1 large-text floor. It's fine
                everywhere else it's used, all of which are light
                backgrounds, so the fix belongs to this usage rather than the
                token. cardDarkLabel is 7.68:1 and already carries the other
                labels on this card. */}
            <Text style={{ color: colors.cardDarkLabel, fontSize: 11, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Share links
            </Text>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 12, marginTop: 6, lineHeight: 17, fontFamily: "Satoshi-Light" }}>
              Each link is unique. Name it by who you're sending it to — sitter, family, vet, anyone.
            </Text>
          </View>

          {/* One PIN for the pet, so it belongs to the card rather than to any
              single row — every link inherits the same hash, and changing it
              changes all of them. Repeating it per link would imply six
              different PINs when there's only ever one.

              Sits directly under the header, above the links: it applies to
              all of them, so it reads as a property of the set rather than
              something attached to whichever link happens to be last. */}
          {/* flex-start, not center: the PIN branch is two lines now (code +
              "Send separately"), and a centered key icon would float between
              them instead of sitting with the code. */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <Key size={12} color="rgba(248,236,238,0.5)" style={{ marginTop: 2 }} />
              {!links.some((l) => l.pin_hash) ? (
                // No PIN anywhere on this pet — the emergency block is open to
                // anyone holding the link, which is worth saying out loud.
                <TouchableOpacity onPress={() => router.push("/edit/emergency?section=pin")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: colors.cardDarkLabel, fontSize: 11, fontFamily: "Satoshi-Medium" }}>
                    We'd set a PIN. Your vet, insurer and emergency contacts sit behind a PIN you set.
                  </Text>
                </TouchableOpacity>
              ) : petPin ? (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: "rgba(248,236,238,0.85)", fontSize: 12, fontFamily: "Satoshi-Bold", letterSpacing: 2 }}>{petPin}</Text>
                  {/* One action, not two: copying and sending are the same
                      intent — get this PIN to the sitter. So it lands on the
                      clipboard and opens the share sheet together, which also
                      covers the apps the sheet can't reach (paste it there
                      instead). On its own line under the PIN rather than
                      beside it — the copied state's longer text needs the
                      room, and the PIN row stays a clean key + code. */}
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setStringAsync(petPin);
                      setPinCopied(true);
                      setTimeout(() => setPinCopied(false), 1600);
                      Share.share({ message: pinMessage(pet.name, petPin) });
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ color: colors.cardDarkLabel, fontSize: 11, fontFamily: "Satoshi-Medium" }}>
                      {pinCopied ? "Copied — send it on its own" : "Send separately"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // A PIN exists but this phone doesn't hold it: reinstalled, new
                // device, or simply set before the app started remembering it.
                // Server-side it's only ever a bcrypt hash, so it genuinely
                // can't be shown — and the only useful move is changing it, so
                // say that rather than explaining our storage model.
                <TouchableOpacity onPress={() => router.push("/edit/emergency?section=pin")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: colors.cardDarkLabel, fontSize: 11, fontFamily: "Satoshi-Medium" }}>
                    PIN set — tap to change it
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Preview rides the PIN row rather than the title row: both are
                card-level actions on the whole set of links, and pairing them
                keeps the heading and its description as one uninterrupted
                block of text. Right-aligned, so it holds the same edge as the
                per-link buttons below it. Always shown — it opens the native
                in-app preview, which reads the pet directly and doesn't need
                a share link to exist (the links-only gate was a leftover from
                when Preview opened the web link). */}
            <TouchableOpacity onPress={preview} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)" }}>
              <Eye size={14} color="rgba(248,236,238,0.8)" />
              <Text style={{ color: "rgba(248,236,238,0.8)", fontSize: 12, fontFamily: "Satoshi-Medium" }}>Preview</Text>
            </TouchableOpacity>
          </View>

          {/* Long lists are capped rather than scrolled. A nested scroll region
              inside the page's own ScrollView traps the gesture — you try to
              scroll the dashboard, the little list moves instead — which is
              worse than one extra tap. Everything stays reachable in place,
              and nothing is hidden behind a collapse. */}
          {visibleLinks.map((link, i) => (
            <View
              key={link.id}
              style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: "rgba(248,236,238,0.1)" }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}>
                <LinkSimple size={15} color={colors.cardDarkLabel} />
              </View>
              <View style={{ flex: 1 }}>
                {renamingId === link.id ? (
                  <TextInput
                    autoFocus
                    value={renameValue}
                    autoCapitalize="sentences"
                    onChangeText={(v) => setRenameValue(capitalizeFirst(v))}
                    onBlur={() => commitRename(link)}
                    onSubmitEditing={() => commitRename(link)}
                    // No underline / extra padding — it changed the row height vs the
                    // plain label and jumped the text up when entering edit mode.
                    style={{ color: colors.cardDarkText, fontSize: 13, letterSpacing: 0, fontFamily: "Satoshi-Medium", padding: 0 }}
                  />
                ) : (
                  <Text style={{ color: colors.cardDarkText, fontSize: 13, fontFamily: "Satoshi-Medium" }} numberOfLines={1}>
                    {link.label || "Untitled link"}
                  </Text>
                )}
                <Text numberOfLines={1} style={{ color: "rgba(248,236,238,0.6)", fontSize: 11, marginTop: 2, fontFamily: "Satoshi-Light" }}>
                  {viewedLabel(link.last_viewed_at, link.view_count)}
                </Text>
                {/* Stay duration (§5.1) — tap to set/change how long the pet's
                    staying. Shows on the recipient page. */}
                <TouchableOpacity onPress={() => setDurationTarget(link)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginTop: 3 }}>
                  {stayPhrase(link.duration_preset, link.ends_at, link.starts_at) ? (
                    <Text style={{ color: colors.cardDarkLabel, fontSize: 11, fontFamily: "Satoshi-Medium" }} numberOfLines={1}>
                      Staying {stayPhrase(link.duration_preset, link.ends_at, link.starts_at)}
                    </Text>
                  ) : (
                    <Text style={{ color: "rgba(248,236,238,0.4)", fontSize: 11, fontFamily: "Satoshi-Medium" }}>+ Add stay length</Text>
                  )}
                </TouchableOpacity>

              </View>
              {/* Action row, left→right: Edit → Share → Delete (#71). Edit is a
                  standalone button rather than a pencil hung off the link name.
                  It opens a menu rather than renaming directly: a pencil reads
                  as "edit this link", and the stay dates are an edit of the
                  link too — hanging them solely off a line of text that looks
                  like the static "Viewed …" line left them undiscoverable. */}
              <TouchableOpacity
                onPress={() => setActionsTarget(link)}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}
              >
                <PencilSimpleLine size={13} color={colors.cardDarkText} />
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
                    {(() => {
                      // Phosphor icons are components, not name strings, so the
                      // three-way choice picks a component rather than a name.
                      const ShareIcon = linkLocked ? LockSimple : copiedId === link.id ? Check : ShareFat;
                      return (
                        <ShareIcon
                          size={15}
                          weight={linkLocked ? "fill" : "regular"}
                          color={linkLocked ? "rgba(248,236,238,0.4)" : copiedId === link.id ? colors.success : colors.cardDarkText}
                        />
                      );
                    })()}
                  </TouchableOpacity>
                );
              })()}
              <TouchableOpacity onPress={() => setRevokeTarget(link)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Trash size={15} color="rgba(248,236,238,0.5)" />
              </TouchableOpacity>
            </View>
          ))}

          {links.length > LINKS_COLLAPSED_COUNT && (
            <TouchableOpacity
              onPress={() => setShowAllLinks((v) => !v)}
              style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(248,236,238,0.1)", flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {showAllLinks ? <CaretUp size={13} color={colors.cardDarkLabel} /> : <CaretDown size={13} color={colors.cardDarkLabel} />}
              <Text style={{ color: colors.cardDarkLabel, fontSize: 12, fontFamily: "Satoshi-Medium" }}>
                {/* Count the HIDDEN links, not the total — four are already
                    on screen, so "Show all 5 links" oversold what the tap
                    reveals. */}
                {showAllLinks
                  ? "Show fewer"
                  : `Show ${links.length - LINKS_COLLAPSED_COUNT} more ${links.length - LINKS_COLLAPSED_COUNT === 1 ? "link" : "links"}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* New link */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(248,236,238,0.1)" }}>
            {showNewLink ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  autoFocus
                  value={newLinkName}
                  autoCapitalize="sentences"
                  onChangeText={(v) => setNewLinkName(capitalizeFirst(v))}
                  onSubmitEditing={handleAddLink}
                  placeholder="Who's this for?"
                  placeholderTextColor="rgba(248,236,238,0.3)"
                  style={{ flex: 1, height: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", color: colors.cardDarkText, fontSize: 13, letterSpacing: 0, fontFamily: "Satoshi" }}
                />
                <TouchableOpacity onPress={handleAddLink} disabled={!newLinkName.trim() || creatingLink} style={{ height: 36, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.cardDarkText, alignItems: "center", justifyContent: "center", minWidth: 74, opacity: newLinkName.trim() && !creatingLink ? 1 : 0.4 }}>
                  {creatingLink ? (
                    <ActivityIndicator size="small" color={colors.cardDark} />
                  ) : (
                    <Text style={{ color: colors.cardDark, fontSize: 13, fontFamily: "Satoshi-Bold" }}>Create</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowNewLink(false); setNewLinkName(""); }} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(248,236,238,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <X size={15} color="rgba(248,236,238,0.6)" />
                </TouchableOpacity>
              </View>
            ) : (() => {
              // Same "visible but locked" treatment as the Share button on a
              // link past the first (#298-adjacent): free tier can create up
              // to FREE_LINK_LIMIT links, so the multi-link feature is seen
              // and understood, not just an unlimited creation flow that
              // happens to fail sharing later.
              //
              // No lock icon in the dashed circle — the plus mark still fits
              // "here's where a new one would go," and a padlock crowded into
              // a 24px circle read as a fiddly decoration rather than a clear
              // signal. The copy carries the "why", not the glyph.
              const newLinkLocked = !isPaid && links.length >= FREE_LINK_LIMIT;
              return (
                <TouchableOpacity
                  onPress={() => (newLinkLocked ? router.push("/upgrade") : setShowNewLink(true))}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "rgba(240,160,176,0.5)", borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
                    {newLinkLocked ? (
                      <LockSimple size={12} weight="fill" color="rgba(248,236,238,0.4)" />
                    ) : (
                      <Plus size={13} color={colors.cardDarkLabel} />
                    )}
                  </View>
                  <Text style={{ color: newLinkLocked ? "rgba(248,236,238,0.4)" : colors.cardDarkLabel, fontSize: 13, fontFamily: "Satoshi-Medium" }}>
                    {newLinkLocked ? "Unlock more links" : "New link"}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>

        {/* Upgrade nudge — soft card with lock chip */}
        {!isPaid && (
          <TouchableOpacity onPress={() => router.push("/upgrade")} activeOpacity={0.85}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.secondary, borderWidth: 1, borderColor: "rgba(184,58,82,0.25)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(184,58,82,0.15)", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <LockSimple size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium", lineHeight: 19 }}>
                  {pet.name}'s routine is saved, not shared yet.
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3, fontFamily: "Satoshi-Light" }}>
                  Unlock so sitters get {pet.name}'s full day — {prices.annual} a year.
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
              <Bell size={15} color={colors.primary} />
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
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </Card>
        )}

        {showTripNudge && (
          <Card style={{ borderColor: "rgba(184,58,82,0.4)", flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(184,58,82,0.15)", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <AirplaneTilt size={15} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium", lineHeight: 19 }}>
                Looks like you're going away.
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3, lineHeight: 17, fontFamily: "Satoshi-Light" }}>
                Let your backup contacts know they're the ones to call. Worth telling your vet too — most clinics will note it on your file over the phone.
              </Text>
              <TouchableOpacity onPress={() => { dismissTripNudge(); router.push("/edit/emergency?section=backup"); }} style={{ marginTop: 6 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium" }}>Check who's listed →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={dismissTripNudge} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.textMuted} />
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
                    <PencilSimpleLine size={16} color={colors.textMuted} />
                  </Card>
                </TouchableOpacity>
                {/* Quick access to the PIN, directly under the emergency row */}
                {s.label === "In an Emergency" && (
                  <TouchableOpacity
                    onPress={() => router.push("/edit/emergency?section=pin")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 6, marginLeft: 20, paddingVertical: 4 }}
                  >
                    <Key size={13} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium" }}>{links.some((l) => l.pin_hash) ? "Change PIN →" : "Set a PIN →"}</Text>
                  </TouchableOpacity>
                )}
                {/* Delete pet — a clear callout under Pet Basics, mirroring Change PIN */}
                {s.label === "Pet Basics" && (
                  <TouchableOpacity
                    onPress={() => router.push("/edit/pet")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 6, marginLeft: 20, paddingVertical: 4 }}
                  >
                    <Trash size={13} color={colors.danger} />
                    <Text style={{ color: colors.danger, fontSize: 12, fontFamily: "Satoshi-Medium" }}>Delete {possessive(pet.name)} profile?</Text>
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
            <WarningCircle size={18} color="rgba(248,236,238,0.85)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.cardDarkText, fontSize: 14, fontFamily: "Satoshi-Medium" }}>If {pet.name} ever goes missing</Text>
            <Text style={{ color: "rgba(248,236,238,0.6)", fontSize: 11, marginTop: 2, fontFamily: "Satoshi-Light" }}>
              One tap. Something to share, something to print. Free, always. Here if you ever need it.
            </Text>
          </View>
          <CaretRight size={16} color="rgba(248,236,238,0.5)" />
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={!!revokeTarget}
        title="Delete this link?"
        message="It stops working immediately for anyone who has it."
        confirmLabel="Delete"
        destructive
        onConfirm={doRevoke}
        onCancel={() => setRevokeTarget(null)}
      />

    </ScrollView>

    {/* Outside the ScrollView: DurationModal is an absolute-fill overlay, not
        an RN Modal, and an absolute child of scroll content scrolls away with
        it. As a sibling it pins to the viewport. */}
    {actionsTarget && (
      <LinkActionsSheet
        visible={!!actionsTarget}
        linkLabel={actionsTarget.label ?? ""}
        onRename={() => {
          const target = actionsTarget;
          setActionsTarget(null);
          setRenamingId(target.id);
          setRenameValue(target.label ?? "");
        }}
        onStayDates={() => {
          const target = actionsTarget;
          setActionsTarget(null);
          setDurationTarget(target);
        }}
        onClose={() => setActionsTarget(null)}
      />
    )}

    {durationTarget && (
      <DurationModal
        visible={!!durationTarget}
        petName={data?.pet.name ?? ""}
        initialPreset={durationTarget.duration_preset}
        initialStartsAt={durationTarget.starts_at}
        initialEndsAt={durationTarget.ends_at}
        onSave={async (preset, endsAt, startsAt) => {
          const id = durationTarget.id;
          setDurationTarget(null);
          await setLinkDuration(id, preset, endsAt, startsAt);
          loadDashboard();
        }}
        onClose={() => setDurationTarget(null)}
      />
    )}
    </View>
  );
}
