import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PIN_MAX_ATTEMPTS, PIN_WINDOW_MINUTES } from "@quirksandall/shared";
import { compareSync } from "bcryptjs";
import { fetchEmergencyContacts } from "../../lib/emergency";
import { UNLOCK_MAX_AGE_SECONDS, signUnlock, unlockCookieName } from "../../lib/unlock";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Client created per-request so builds don't require env vars at import time
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const body = await req.json().catch(() => null);
  const token = body && typeof body === "object" ? body.token : undefined;
  const pin = body && typeof body === "object" ? body.pin : undefined;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  if (typeof token !== "string" || !token || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

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
    return NextResponse.json({ success: false });
  }

  // Rate limit check: count recent attempts for this link+ip in the window
  const windowStart = new Date(Date.now() - PIN_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("pin_attempts")
    .select("id", { count: "exact", head: true })
    .eq("link_id", link.id)
    .eq("ip", ip)
    .gte("attempted_at", windowStart);

  if ((count ?? 0) >= PIN_MAX_ATTEMPTS) {
    return NextResponse.json({ success: false, cooldown: true });
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
