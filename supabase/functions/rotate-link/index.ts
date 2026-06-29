// Generates a fresh share token for a pet, invalidating the old one.
// Paid-tier only — ownership validated server-side.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const { pet_id } = await req.json();
  if (!pet_id) return new Response("Missing pet_id", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Check paid tier
  const { data: owner } = await supabase
    .from("owners")
    .select("purchase_status")
    .eq("id", user.id)
    .single();

  if (owner?.purchase_status !== "paid") {
    return new Response(JSON.stringify({ error: "Paid feature" }), { status: 403 });
  }

  // Verify pet ownership
  const { data: pet } = await supabase
    .from("pets")
    .select("owner_id")
    .eq("id", pet_id)
    .single();

  if (!pet || pet.owner_id !== user.id) {
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

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ token: newLink.token }), {
    headers: { "Content-Type": "application/json" },
  });
});
