import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEmergencyContacts } from "../../lib/emergency";
import { unlockCookieName, verifyUnlock } from "../../lib/unlock";
import { checkRateLimit, clientIp, rateLimitEnv } from "../../lib/rateLimit";

export const runtime = "nodejs";

const MAX_PER_WINDOW = rateLimitEnv("RATE_LIMIT_PIN_RESUME_MAX", 30);
const WINDOW_SECONDS = rateLimitEnv("RATE_LIMIT_PIN_RESUME_WINDOW_SECONDS", 15 * 60);

// Persisted unlock resume (#87). A device that previously entered the correct
// PIN holds a signed cookie; this returns the contacts without re-entry — but
// only after re-checking the link is still live and the PIN unchanged, so
// revoke and PIN changes re-lock immediately.
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const body = await req.json().catch(() => null);
  const token = body && typeof body === "object" ? body.token : undefined;
  if (typeof token !== "string" || !token) return NextResponse.json({ success: false }, { status: 400 });

  const allowed = await checkRateLimit(supabase, "pin_resume", `${token}:${clientIp(req)}`, MAX_PER_WINDOW, WINDOW_SECONDS);
  if (!allowed) return NextResponse.json({ success: false, cooldown: true }, { status: 429 });

  const cookie = req.cookies.get(unlockCookieName(token))?.value;
  if (!cookie) return NextResponse.json({ success: false });

  const { data: link } = await supabase
    .from("share_links")
    .select("id, pin_hash, revoked, pet_id")
    .eq("token", token)
    .single();

  // Any of: revoked link, cleared PIN, changed PIN, or an expired 30-day window
  // → drop the stale cookie and fall back to the PIN gate.
  const clear = () => {
    const r = NextResponse.json({ success: false });
    r.cookies.set({ name: unlockCookieName(token), value: "", path: "/", maxAge: 0 });
    return r;
  };
  if (!link || link.revoked || !link.pin_hash) return clear();
  if (!verifyUnlock(token, link.pin_hash, cookie)) return clear();

  const contacts = await fetchEmergencyContacts(supabase, link.pet_id);
  return NextResponse.json({ success: true, contacts });
}
