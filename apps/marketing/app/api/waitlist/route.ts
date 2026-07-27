import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Best-effort in-memory throttle (per serverless instance). Enough to blunt
// casual abuse; upgrade to Cloudflare Turnstile / a shared store if a public
// form starts attracting real bot traffic.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

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
  const source = body.source === "footer" ? "footer" : "hero";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  // Throttle by IP.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  recent.push(now);
  hits.set(ip, recent);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("waitlist: Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY)");
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.from("waitlist").insert({ email, source });

  // Duplicate email → unique violation (23505). Treat as success: a repeat
  // signup should land on the success state, not an error.
  if (error && error.code !== "23505") {
    console.error("waitlist insert failed", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
