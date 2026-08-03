// Supabase Edge Function — PIN verification with server-side rate limiting.
// This runs in Deno. The web app's Next.js API route does the same job for
// the web recipient page; this edge function can be used by the mobile app
// or as an alternative backend for the web.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { rateLimitEnv } from "../_shared/rateLimit.ts";

// Defaults mirror packages/shared/src/logic.ts's PIN_MAX_ATTEMPTS/
// PIN_WINDOW_MINUTES (kept as separate literals here since Deno can't
// import @quirksandall/shared — see rotate-link/index.ts for the same
// constraint), overridable per deployment via `supabase secrets set`.
const PIN_MAX_ATTEMPTS = rateLimitEnv("RATE_LIMIT_PIN_CHECK_MAX", 20);
const PIN_WINDOW_MINUTES = rateLimitEnv("RATE_LIMIT_PIN_CHECK_WINDOW_MINUTES", 15);

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const body = await req.json().catch(() => null);
    const token = body && typeof body === "object" ? (body as { token?: unknown }).token : undefined;
    const pin = body && typeof body === "object" ? (body as { pin?: unknown }).pin : undefined;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

    if (typeof token !== "string" || !token || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
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

    // Same shape (200, success:false) as a wrong PIN below — a 404 here would
    // let an attacker distinguish "no such link" from "link exists, wrong PIN"
    // and enumerate valid share tokens.
    if (!link || link.revoked) {
      return new Response(JSON.stringify({ success: false }), { status: 200 });
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
    const correct = !!link.pin_hash && compareSync(pin, link.pin_hash);

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
          primaryVet: {
            contactName: vetInfo.primary_vet?.contact_name ?? "",
            clinic: vetInfo.primary_vet?.clinic ?? "",
            address: vetInfo.primary_vet?.address ?? "",
            phone: vetInfo.primary_vet?.phone ?? "",
          },
          emergencyVet: {
            clinic: vetInfo.emergency_vet?.clinic ?? "",
            address: vetInfo.emergency_vet?.address ?? "",
            phone: vetInfo.emergency_vet?.phone ?? "",
          },
          insurance: vetInfo.insurance ?? {},
          ownerContact: { name: owner.name ?? "", phone: owner.primary_phone ?? "" },
          backupContacts: (owner.backup_contacts ?? [])
            .filter((c: any) => c.consent_to_share)
            .map((c: any) => ({
              name: c.name ?? "",
              relationship: c.relationship ?? "",
              phone: c.phone ?? "",
              consentToShare: !!c.consent_to_share,
              isDecisionContact: !!c.is_decision_contact,
              decisionPriority: c.decision_priority ?? undefined,
            })),
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("pin-check: unhandled error", err);
    return new Response(JSON.stringify({ success: false }), { status: 500 });
  }
});
