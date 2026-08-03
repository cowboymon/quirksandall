// Sets the PIN hash on a share_link. Called by the mobile app after link creation.
// Validates that the calling user owns the pet for that link.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => null);
    const link_id = body && typeof body === "object" ? (body as { link_id?: unknown }).link_id : undefined;
    const pin = body && typeof body === "object" ? (body as { pin?: unknown }).pin : undefined;

    if (typeof link_id !== "string" || !UUID_RE.test(link_id) || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { data: link } = await supabase
      .from("share_links")
      .select("id, pet_id")
      .eq("id", link_id)
      .single();

    if (!link) return new Response("Not found", { status: 404 });

    const { data: pet } = await supabase
      .from("pets")
      .select("owner_id")
      .eq("id", link.pet_id)
      .single();

    if (!pet || pet.owner_id !== user.id) return new Response("Forbidden", { status: 403 });

    // bcrypt (salted, slow) — a 4-digit PIN must never sit behind a fast unsalted hash
    const pinHash = hashSync(pin);
    const { error } = await supabase.from("share_links").update({ pin_hash: pinHash }).eq("id", link_id);
    if (error) {
      console.error("set-pin: update failed", error);
      return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("set-pin: unhandled error", err);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
  }
});
