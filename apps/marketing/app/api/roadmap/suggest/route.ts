import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyTheme } from "../../../lib/classify";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

export const runtime = "nodejs";

const WINDOW_SECONDS = 60;
const MAX_PER_WINDOW = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cost guard for AI tagging: link-bearing suggestions are almost always spam,
// so skip the paid classification for them (they still save, just Untagged),
// and cap total tagging calls per instance per hour so a flood can't run up
// the Anthropic bill. Neither affects whether the suggestion is stored.
const URL_RE = /(https?:\/\/|www\.)/i;
const TAG_WINDOW_MS = 3_600_000;
const TAG_MAX_PER_WINDOW = 100;
let tagCalls: number[] = [];
function underTagCap(): boolean {
  const now = Date.now();
  tagCalls = tagCalls.filter((t) => now - t < TAG_WINDOW_MS);
  if (tagCalls.length >= TAG_MAX_PER_WINDOW) return false;
  tagCalls.push(now);
  return true;
}

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

  // Runtime env — see the waitlist route for why the plain names are preferred.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("suggest: Supabase env not configured");
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 503 });
  }

  const supabase = createClient(url, key);

  // Durable, cross-instance throttle by IP.
  const allowed = await checkRateLimit(supabase, "roadmap_suggest", clientIp(req), MAX_PER_WINDOW, WINDOW_SECONDS);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

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
  // Skip (to protect cost) for link-spam or once the hourly cap is hit.
  if (!URL_RE.test(suggestion) && underTagCap()) {
    try {
      const theme = await classifyTheme(suggestion);
      if (theme && data?.id) {
        await supabase.from("roadmap_suggestions").update({ theme }).eq("id", data.id);
      }
    } catch {
      // leave untagged
    }
  }

  return NextResponse.json({ ok: true });
}
