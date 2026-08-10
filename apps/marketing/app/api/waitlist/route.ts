import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, clientIp, rateLimitEnv } from "../../lib/rateLimit";
import { logSupabaseError } from "../../lib/logSafe";

export const runtime = "nodejs";

const WINDOW_SECONDS = rateLimitEnv("RATE_LIMIT_WAITLIST_WINDOW_SECONDS", 60);
const MAX_PER_WINDOW = rateLimitEnv("RATE_LIMIT_WAITLIST_MAX", 5);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string; company?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // Honeypot: real users never fill "company". Silently accept and drop it so a
  // bot gets the success path with nothing written.
  if (body.company) return NextResponse.json({ ok: true });

  const email = (body.email ?? "").trim().toLowerCase();
  const SOURCES = ["hero", "footer", "blog", "printable"];
  const source = SOURCES.includes(body.source ?? "") ? (body.source as string) : "hero";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  // Read at runtime. Prefer the plain (non-public) names so the value isn't
  // baked into the build like a NEXT_PUBLIC_* var — that inlining is why a
  // build compiled before the var was set keeps returning "unconfigured".
  // Fall back to the public / role-key names so common setups just work.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("waitlist: Supabase env not configured (need SUPABASE_URL + SUPABASE_SERVICE_KEY)");
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 503 });
  }

  const supabase = createClient(url, key);

  // Durable, cross-instance throttle by IP (survives cold starts, unlike an
  // in-memory Map).
  const allowed = await checkRateLimit(supabase, "waitlist", clientIp(req), MAX_PER_WINDOW, WINDOW_SECONDS);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const { error } = await supabase.from("waitlist").insert({ email, source });

  // Duplicate email → unique violation (23505). Treat as success: a repeat
  // signup should land on the success state, not an error.
  if (error && error.code !== "23505") {
    logSupabaseError("waitlist insert failed", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
