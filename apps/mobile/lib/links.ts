// Named share-link CRUD. Owners manage their own pets' links directly under
// RLS (the share_links_owner policy). Tokens are generated client-side with a
// crypto-random source so they're unguessable; the DB unique constraint guards
// the (astronomically unlikely) collision.
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { supabase } from "./supabase";
import { track, AnalyticsEvent } from "./analytics";

export type OwnerLink = {
  id: string;
  token: string;
  label: string | null;
  revoked: boolean;
  last_viewed_at: string | null;
  created_at: string;
  pin_hash: string | null;
  duration_preset: string | null;
  starts_at: string | null;
  ends_at: string | null;
  first_shared_at: string | null;
};

export function randomToken(): string {
  const bytes = Crypto.getRandomBytes(24);
  // base64url without padding
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function listLinks(petId: string): Promise<OwnerLink[]> {
  const { data } = await supabase
    .from("share_links")
    .select("id, token, label, revoked, last_viewed_at, created_at, pin_hash, duration_preset, starts_at, ends_at, first_shared_at")
    .eq("pet_id", petId)
    .eq("revoked", false)
    .order("created_at", { ascending: true });
  const links = data ?? [];

  // A stay that has already finished shouldn't linger on the dashboard as if
  // it were still running. This clears it at the source so the owner's own
  // view is accurate, and so a link they reuse next month doesn't carry last
  // month's dates. Silent by design — telling someone their pet's stay ended
  // is news they already have. Fire-and-forget: a failed cleanup is cosmetic.
  //
  // Deliberate consequence (decided 10 Aug 2026): the recipient page's
  // "Olive is no longer staying with you." line is therefore TRANSIENT — it
  // shows to sitters only until the owner next opens their dashboard, which
  // is when this runs. That's the intended trade: the message is a courtesy
  // for the day or two after a stay, and keeping the clearing means a reused
  // link never greets a new sitter with a stale "no longer staying". Don't
  // "fix" the disappearing message by removing this cleanup without also
  // handling reuse (clearing on re-share instead of on expiry).
  const expired = links.filter((l) => {
    if (!l.ends_at) return false;
    const d = new Date(l.ends_at);
    if (isNaN(d.getTime())) return false;
    d.setHours(23, 59, 59, 999);
    return d.getTime() < Date.now();
  });
  if (expired.length) {
    const ids = expired.map((l) => l.id);
    supabase.from("share_links").update({ duration_preset: null, starts_at: null, ends_at: null }).in("id", ids).then(() => {});
    for (const l of links) {
      if (ids.includes(l.id)) { l.duration_preset = null; l.starts_at = null; l.ends_at = null; }
    }
  }
  return links;
}

// Create a new named link. New links inherit the pet's existing PIN hash (if any
// of the pet's links has one) so the emergency-contacts PIN gate keeps working.
export async function createLink(petId: string, label: string): Promise<OwnerLink | null> {
  const { data: existing } = await supabase
    .from("share_links")
    .select("pin_hash")
    .eq("pet_id", petId)
    .not("pin_hash", "is", null)
    .limit(1)
    .maybeSingle();

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("share_links")
      .insert({ pet_id: petId, token: randomToken(), label, pin_hash: existing?.pin_hash ?? null })
      .select("id, token, label, revoked, last_viewed_at, created_at, pin_hash, duration_preset, starts_at, ends_at, first_shared_at")
      .single();
    if (!error && data) {
      // Value Moment — a shareable link now exists for this pet.
      track(AnalyticsEvent.ShareLinkCreated, { context: "dashboard", platform: Platform.OS });
      return data;
    }
    // 23505 = unique_violation on token — retry with a fresh token
    if (error && (error as { code?: string }).code !== "23505") break;
  }
  return null;
}

// Stamps the first time a link was actually sent, so the explanatory intro
// message is used once and repeat sends stay bare. Only ever set, never
// cleared — "has this sitter seen the explanation" doesn't become false again.
export async function markLinkShared(id: string): Promise<void> {
  await supabase.from("share_links").update({ first_shared_at: new Date().toISOString() }).eq("id", id);
}

export async function renameLink(id: string, label: string): Promise<void> {
  await supabase.from("share_links").update({ label }).eq("id", id);
}

// Set (or clear) a link's stay duration (§5.1). A preset and an exact end date
// are mutually exclusive: choosing a preset clears ends_at and vice-versa.
// starts_at (#20) is independent — it composes with either. Pass all null to
// clear.
export async function setLinkDuration(
  id: string,
  duration_preset: string | null,
  ends_at: string | null,
  starts_at: string | null = null
): Promise<void> {
  await supabase.from("share_links").update({ duration_preset, ends_at, starts_at }).eq("id", id);
}

export async function revokeLink(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("share_links").update({ revoked: true }).eq("id", id);
  return { error: error?.message ?? null };
}
