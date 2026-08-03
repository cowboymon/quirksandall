// Generates a fresh share token for a pet, invalidating the old one.
// Paid-tier only — ownership validated server-side.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitClient, rateLimitEnv } from "../_shared/rateLimit.ts";
import { isOwnedPet } from "../_shared/authz.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rotating a link revokes every existing link for the pet — a legitimate
// but infrequent action. The limit bounds a compromised session (or a buggy
// client retry loop) from repeatedly invalidating a pet's share link out
// from under whoever it was shared with.
const MAX_PER_WINDOW = rateLimitEnv("RATE_LIMIT_ROTATE_LINK_MAX", 10);
const WINDOW_SECONDS = rateLimitEnv("RATE_LIMIT_ROTATE_LINK_WINDOW_SECONDS", 60 * 60);

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => null);
    const pet_id = body && typeof body === "object" ? (body as { pet_id?: unknown }).pet_id : undefined;
    if (typeof pet_id !== "string" || !UUID_RE.test(pet_id)) {
      return new Response(JSON.stringify({ error: "invalid_pet_id" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const allowed = await checkRateLimit(rateLimitClient(), "rotate_link", user.id, MAX_PER_WINDOW, WINDOW_SECONDS);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 });
    }

    // Check paid tier. Deno can't import @quirksandall/shared, so this inlines
    // isUnlocked() from packages/shared/src/logic.ts — paid AND not lapsed
    // (expires_at null = lifetime; a date = subscription period end). Keep the
    // two in sync.
    const { data: owner } = await supabase
      .from("owners")
      .select("purchase_status, expires_at")
      .eq("id", user.id)
      .single();

    const unlocked =
      owner?.purchase_status === "paid" &&
      (!owner.expires_at || new Date(owner.expires_at).getTime() > Date.now());
    if (!unlocked) {
      return new Response(JSON.stringify({ error: "Paid feature" }), { status: 403 });
    }

    // Verify pet ownership
    const { data: pet } = await supabase
      .from("pets")
      .select("owner_id")
      .eq("id", pet_id)
      .single();

    if (!isOwnedPet(pet, user.id)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Revoke all existing links for this pet
    await supabase.from("share_links").update({ revoked: true }).eq("pet_id", pet_id);

    // Create fresh token
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const { data: newLink, error } = await supabase
      .from("share_links")
      .insert({ pet_id, token, mode: "full", revoked: false })
      .select("token")
      .single();

    if (error) {
      console.error("rotate-link: insert failed", error);
      return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
    }

    return new Response(JSON.stringify({ token: newLink.token }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("rotate-link: unhandled error", err);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
  }
});
