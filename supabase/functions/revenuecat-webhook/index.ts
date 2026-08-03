// RevenueCat server webhook → the authority on unlock state.
//
// The client writes owners.purchase_status/unlock_source/expires_at right
// after a purchase so the unlock is instant, but the client can't be trusted
// for the one transition it never witnesses: a subscription lapsing. Nobody
// opens the app to tell us they stopped paying. This webhook hears about it
// from RevenueCat instead — renewals push expires_at forward, expirations
// close the entitlement, refunds revoke it.
//
// Setup (RevenueCat dashboard → Integrations → Webhooks):
//   URL:    {SUPABASE_URL}/functions/v1/revenuecat-webhook
//   Header: Authorization: Bearer {RC_WEBHOOK_SECRET}   (set the same value
//           as a function secret: `supabase secrets set RC_WEBHOOK_SECRET=…`)
//   Deploy with --no-verify-jwt: RevenueCat is not a Supabase user, so the
//   platform JWT check must be off and the shared secret above is the auth.
//
// app_user_id is the Supabase user id because the app calls Purchases.logIn
// with it (lib/purchases.ts identifyPurchaser). Anonymous ids
// ($RCAnonymousID:…) are acknowledged with 200 and skipped — returning an
// error would just make RevenueCat retry an event we can never attribute.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeEqual, isAnonymousAppUserId, isValidAppUserId, parseTimestampMs, isValidEventShape } from "./validate.ts";

// Event types that (re)grant access vs. the ones that end it. CANCELLATION is
// deliberately neither: it means auto-renew was switched off, but the user
// keeps what they paid for until the period ends — EXPIRATION is the event
// that actually closes the door.
const GRANTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
]);
const REVOKES = new Set(["EXPIRATION"]);

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const secret = Deno.env.get("RC_WEBHOOK_SECRET");
    const auth = req.headers.get("Authorization") ?? "";
    const expected = secret ? `Bearer ${secret}` : null;
    if (!expected || !safeEqual(auth, expected)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const event = body && typeof body === "object" ? (body as { event?: unknown }).event : null;
    if (!isValidEventShape(event)) {
      return new Response(JSON.stringify({ error: "invalid_event" }), { status: 400 });
    }

    const rawUserId = event.app_user_id;
    if (typeof rawUserId === "string" && isAnonymousAppUserId(rawUserId)) {
      return new Response(JSON.stringify({ skipped: "anonymous app_user_id" }), { status: 200 });
    }
    if (!isValidAppUserId(rawUserId)) {
      return new Response(JSON.stringify({ error: "invalid_app_user_id" }), { status: 400 });
    }
    const userId = rawUserId;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (GRANTS.has(event.type)) {
      // expiration_at_ms is set for subscriptions and absent for the lifetime
      // non-consumable — which is also how the source is derived, so a product
      // rename can't misfile buyers.
      const expirationMs = parseTimestampMs(event.expiration_at_ms);
      const purchasedMs = parseTimestampMs(event.purchased_at_ms) ?? Date.now();
      const expiresAt = expirationMs != null ? new Date(expirationMs).toISOString() : null;
      const { error } = await supabase
        .from("owners")
        .update({
          purchase_status: "paid",
          unlock_source: expiresAt ? "iap_annual" : "iap_lifetime",
          unlocked_at: new Date(purchasedMs).toISOString(),
          expires_at: expiresAt,
        })
        .eq("id", userId);
      if (error) {
        console.error("revenuecat-webhook: owners update failed", error);
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (REVOKES.has(event.type)) {
      // Never downgrade a lifetime holder on a subscription event: someone who
      // once subscribed and later bought lifetime has expires_at null, and an
      // EXPIRATION for the old subscription must not touch them.
      const { error } = await supabase
        .from("owners")
        .update({ purchase_status: "expired" })
        .eq("id", userId)
        .eq("unlock_source", "iap_annual");
      if (error) {
        console.error("revenuecat-webhook: owners update failed", error);
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // TRANSFER, BILLING_ISSUE, CANCELLATION, TEST … — nothing to write, but
    // acknowledge so RevenueCat doesn't retry.
    return new Response(JSON.stringify({ ignored: event.type }), { status: 200 });
  } catch (err) {
    // Never let an uncaught exception surface a Deno stack trace to the caller.
    console.error("revenuecat-webhook: unhandled error", err);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
  }
});
