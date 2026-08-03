import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { unlockCookieName } from "../../lib/unlock";
import { checkRateLimit, clientIp, rateLimitEnv } from "../../lib/rateLimit";

export const runtime = "nodejs";

const MAX_PER_WINDOW = rateLimitEnv("RATE_LIMIT_PIN_LOCK_MAX", 30);
const WINDOW_SECONDS = rateLimitEnv("RATE_LIMIT_PIN_LOCK_WINDOW_SECONDS", 60);

// "Lock again on this device" (#87). Clears the persisted-unlock cookie so the
// PIN is required next time — for shared or borrowed devices. The cookie is
// httpOnly, so only the server can clear it. Cheap (no DB read/write on the
// happy path) but still rate limited for consistency — every endpoint gets a
// limit, not just the expensive ones.
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (url && key) {
    const supabase = createClient(url, key);
    const allowed = await checkRateLimit(supabase, "pin_lock", clientIp(req), MAX_PER_WINDOW, WINDOW_SECONDS);
    if (!allowed) return NextResponse.json({ success: false, cooldown: true }, { status: 429 });
  }

  const res = NextResponse.json({ success: true });
  if (token) {
    res.cookies.set({ name: unlockCookieName(token), value: "", path: "/", maxAge: 0 });
  }
  return res;
}
