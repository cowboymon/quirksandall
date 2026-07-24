// Named share-link CRUD. Owners manage their own pets' links directly under
// RLS (the share_links_owner policy). Tokens are generated client-side with a
// crypto-random source so they're unguessable; the DB unique constraint guards
// the (astronomically unlikely) collision.
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

export type OwnerLink = {
  id: string;
  token: string;
  label: string | null;
  revoked: boolean;
  last_viewed_at: string | null;
  created_at: string;
  pin_hash: string | null;
};

function randomToken(): string {
  const bytes = Crypto.getRandomBytes(24);
  // base64url without padding
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function listLinks(petId: string): Promise<OwnerLink[]> {
  const { data } = await supabase
    .from("share_links")
    .select("id, token, label, revoked, last_viewed_at, created_at, pin_hash")
    .eq("pet_id", petId)
    .eq("revoked", false)
    .order("created_at", { ascending: true });
  return data ?? [];
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
      .select("id, token, label, revoked, last_viewed_at, created_at, pin_hash")
      .single();
    if (!error && data) return data;
    // 23505 = unique_violation on token — retry with a fresh token
    if (error && (error as { code?: string }).code !== "23505") break;
  }
  return null;
}

export async function renameLink(id: string, label: string): Promise<void> {
  await supabase.from("share_links").update({ label }).eq("id", id);
}

export async function revokeLink(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("share_links").update({ revoked: true }).eq("id", id);
  return { error: error?.message ?? null };
}
