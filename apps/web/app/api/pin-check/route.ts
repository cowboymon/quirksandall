import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PIN_MAX_ATTEMPTS, PIN_WINDOW_MINUTES } from "@quirksandall/shared";
import { compareSync } from "bcryptjs";
import { fetchEmergencyContacts } from "../../lib/emergency";
import { UNLOCK_MAX_AGE_SECONDS, signUnlock, unlockCookieName } from "../../lib/unlock";
import { rateLimitEnv, clientIp } from "../../lib/rateLimit";

export const runtime = "nodejs";

// Env-overridable, defaulting to the shared constants used app-wide for PIN
// attempts (packages/shared/src/logic.ts) so this stays in sync with the
// default everywhere else unless explicitly overridden here.
const MAX_ATTEMPTS = rateLimitEnv("RATE_LIMIT_PIN_CHECK_MAX", PIN_MAX_ATTEMPTS);
const WINDOW_MINUTES = rateLimitEnv("RATE_LIMIT_PIN_CHECK_WINDOW_MINUTES", PIN_WINDOW_MINUTES);
// Per-link ceiling across ALL IPs in the same window — the backstop that
// x-forwarded-for rotation can't dodge. Without it, an attacker rotating
// spoofed XFF values gets a fresh per-IP allowance each time and can walk
// the whole 4-digit keyspace. Sized for several legitimate sitters fumbling
// at once, far below a viable brute-force rate.
const MAX_ATTEMPTS_PER_LINK = rateLimitEnv("RATE_LIMIT_PIN_CHECK_LINK_MAX", 60);

export async function POST(req: NextRequest) {
  // Client created per-request so builds don't require env vars at import time
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const body = await req.json().catch(() => null);
  const token = body && typeof body === "object" ? body.token : undefined;
  const pin = body && typeof body === "object" ? body.pin : undefined;
  const ip = clientIp(req);

  if (typeof token !== "string" || !token || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // Resolve link — with expiry and the pet's archived state, matching the
  // recipient page's own gate. Without these, an ex-sitter who knew the PIN
  // could keep pulling the PIN-gated contacts through this endpoint forever
  // after the link expired or the pet was archived.
  const { data: link } = await supabase
    .from("share_links")
    .select("id, pin_hash, revoked, expires_at, pet_id, pets!inner(status)")
    .eq("token", token)
    .single();

  // Same shape (200, success:false) as a wrong PIN below — a 404 here would
  // let an attacker distinguish "no such link" from "link exists, wrong PIN"
  // and enumerate valid share tokens. Expired/archived deliberately share it
  // too, for the same reason.
  const expired = !!link?.expires_at && new Date(link.expires_at) < new Date();
  const archived = (link as any)?.pets?.status === "archived";
  if (!link || link.revoked || expired || archived) {
    return NextResponse.json({ success: false });
  }

  // Rate limit check: per-link+ip for normal use, plus a per-link total
  // across all IPs so XFF rotation can't reset the allowance.
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const [{ count }, { count: linkCount }] = await Promise.all([
    supabase
      .from("pin_attempts")
      .select("id", { count: "exact", head: true })
      .eq("link_id", link.id)
      .eq("ip", ip)
      .gte("attempted_at", windowStart),
    supabase
      .from("pin_attempts")
      .select("id", { count: "exact", head: true })
      .eq("link_id", link.id)
      .gte("attempted_at", windowStart),
  ]);

  if ((count ?? 0) >= MAX_ATTEMPTS || (linkCount ?? 0) >= MAX_ATTEMPTS_PER_LINK) {
    // 429 here doesn't reveal link existence/PIN correctness — those stay on
    // the shared 200/{success:false} shape above and below — it only says
    // "this specific link+IP pair is rate limited right now", which is safe
    // to disclose per the "return a proper 429" requirement.
    return NextResponse.json({ success: false, cooldown: true }, { status: 429 });
  }

  // Check PIN — bcrypt (salted, slow); a 4-digit PIN must never sit behind
  // a fast unsalted hash
  const correct = !!link.pin_hash && compareSync(pin, link.pin_hash);

  // Log attempt
  await supabase.from("pin_attempts").insert({
    link_id: link.id,
    ip,
    success: correct,
    attempted_at: new Date().toISOString(),
  });

  if (!correct) {
    return NextResponse.json({ success: false });
  }

  // Fetch emergency contacts with separate reads (embeds were returning empty
  // relations, which surfaced nothing after unlock).
  const contacts = await fetchEmergencyContacts(supabase, link.pet_id);

  // Persist the unlock on this device (#87): a signed, httpOnly cookie bound to
  // this link's PIN hash, good for 30 days, so the sitter doesn't re-key the PIN
  // every visit. Every future visit still re-checks revoked/PIN server-side.
  const res = NextResponse.json({ success: true, contacts });
  res.cookies.set({
    name: unlockCookieName(token),
    value: signUnlock(token, link.pin_hash!),
    httpOnly: true,
    // Fail-safe default: secure unless explicitly running local dev over
    // http://localhost. `!== "development"` (rather than `=== "production"`)
    // means an unset/unexpected NODE_ENV value still gets the secure cookie,
    // instead of silently downgrading to insecure.
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_MAX_AGE_SECONDS,
  });
  return res;
}
