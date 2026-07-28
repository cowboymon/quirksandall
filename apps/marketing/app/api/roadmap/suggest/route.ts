import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyTheme } from "../../../lib/classify";

export const runtime = "nodejs";

// Best-effort in-memory throttle (per serverless instance), same as the other
// public forms.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: { suggestion?: string; email?: string; company?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // Honeypot: real users never fill "company". Accept and drop.
  if (body.company) return NextResponse.json({ ok: true });

  const suggestion = (body.suggestion ?? "").trim();
  if (suggestion.length < 3 || suggestion.length > 2000) {
    return NextResponse.json({ ok: false, error: "invalid_suggestion" }, { status: 400 });
  }

  // Email is optional; validate only if given.
  const emailRaw = (body.email ?? "").trim().toLowerCase();
  const email = emailRaw || null;
  if (email && (!EMAIL_RE.test(email) || email.length > 254)) {
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

  // Runtime env — see the waitlist route for why the plain names are preferred.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("suggest: Supabase env not configured");
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("roadmap_suggestions")
    .insert({ suggestion, email })
    .select("id")
    .single();
  if (error) {
    console.error("suggestion insert failed", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }

  // Best-effort AI theming — never let it fail the user's submission. Falls
  // back to untagged when ANTHROPIC_API_KEY isn't set or the call errors.
  try {
    const theme = await classifyTheme(suggestion);
    if (theme && data?.id) {
      await supabase.from("roadmap_suggestions").update({ theme }).eq("id", data.id);
    }
  } catch {
    // leave untagged
  }

  return NextResponse.json({ ok: true });
}
