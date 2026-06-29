// Supabase Edge Function — PIN verification with server-side rate limiting.
// This runs in Deno. The web app's Next.js API route does the same job for
// the web recipient page; this edge function can be used by the mobile app
// or as an alternative backend for the web.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";

const PIN_MAX_ATTEMPTS = 20;
const PIN_WINDOW_MINUTES = 15;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { token, pin } = await req.json();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  if (!token || !pin || pin.length !== 4) {
    return new Response(JSON.stringify({ success: false }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Resolve link
  const { data: link } = await supabase
    .from("share_links")
    .select("id, pin_hash, revoked, pet_id")
    .eq("token", token)
    .single();

  if (!link || link.revoked) {
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  }

  // Rate limit
  const windowStart = new Date(Date.now() - PIN_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("pin_attempts")
    .select("id", { count: "exact", head: true })
    .eq("link_id", link.id)
    .eq("ip", ip)
    .gte("attempted_at", windowStart);

  if ((count ?? 0) >= PIN_MAX_ATTEMPTS) {
    return new Response(JSON.stringify({ success: false, cooldown: true }), { status: 429 });
  }

  // Verify PIN
  const pinHash = createHash("sha256").update(pin).digest("hex");
  const correct = link.pin_hash === pinHash;

  await supabase.from("pin_attempts").insert({
    link_id: link.id,
    ip,
    success: correct,
    attempted_at: new Date().toISOString(),
  });

  if (!correct) {
    return new Response(JSON.stringify({ success: false }), { status: 200 });
  }

  // Fetch contacts
  const { data: pet } = await supabase
    .from("pets")
    .select(`
      owners!inner(name, primary_phone, backup_contacts),
      pet_vet_info(primary_vet, emergency_vet, insurance)
    `)
    .eq("id", link.pet_id)
    .single();

  const vetInfo = (pet as any)?.pet_vet_info?.[0] ?? {};
  const owner = (pet as any)?.owners ?? {};

  return new Response(
    JSON.stringify({
      success: true,
      contacts: {
        primaryVet: vetInfo.primary_vet ?? {},
        emergencyVet: vetInfo.emergency_vet ?? {},
        insurance: vetInfo.insurance ?? {},
        ownerContact: { name: owner.name ?? "", phone: owner.primary_phone ?? "" },
        backupContacts: (owner.backup_contacts ?? []).filter((c: any) => c.consent_to_share),
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
