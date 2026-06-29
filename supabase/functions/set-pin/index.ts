// Sets the PIN hash on a share_link. Called by the mobile app after link creation.
// Validates that the calling user owns the pet for that link.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const { link_id, pin } = await req.json();

  if (!link_id || !pin || !/^\d{4}$/.test(pin)) {
    return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
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

  const pinHash = createHash("sha256").update(pin).digest("hex");
  await supabase.from("share_links").update({ pin_hash: pinHash }).eq("id", link_id);

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
