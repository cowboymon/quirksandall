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
  const { token, pin } = await req.json();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  if (!token || !pin || pin.length !== 4) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  // Resolve link
  const { data: link } = await supabase
    .from("share_links")
    .select("id, pin_hash, revoked, pet_id")
    .eq("token", token)
    .single();

  if (!link || link.revoked) {
    return NextResponse.json({ success: false }, { status: 404 });
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_MAX_AGE_SECONDS,
  });
  return res;
}
