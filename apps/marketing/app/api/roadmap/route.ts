import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VOTABLE_IDS, type CountsMap } from "../../roadmap/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort in-memory throttle (per serverless instance), mirroring the
// waitlist route. Enough to blunt casual abuse of the vote endpoint.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

const VOTER_RE = /^[a-zA-Z0-9-]{8,64}$/;

// Read at runtime — see the waitlist route for why the plain (non-public) names
// are preferred over NEXT_PUBLIC_*.
function client() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Aggregate raw {item_id, vote} rows into { [itemId]: { up, down } }, seeding
// every known item at zero so the client always gets a full map.
function aggregate(rows: { item_id: string; vote: number }[]): CountsMap {
  const counts: CountsMap = {};
  for (const id of VOTABLE_IDS) counts[id] = { up: 0, down: 0 };
  for (const r of rows) {
    if (!counts[r.item_id]) continue;
    if (r.vote === 1) counts[r.item_id].up += 1;
    else if (r.vote === -1) counts[r.item_id].down += 1;
  }
  return counts;
}

// GET /api/roadmap?voter=<id> → { counts, mine }
// counts: totals per item. mine: this voter's standing vote per item (1 | -1).
export async function GET(req: NextRequest) {
  const supabase = client();
  if (!supabase) {
    // No backend configured: return empty so the page still renders cleanly.
    return NextResponse.json({ counts: aggregate([]), mine: {} });
  }

  const voter = req.nextUrl.searchParams.get("voter") ?? "";

  const { data, error } = await supabase.from("roadmap_votes").select("item_id, vote, voter_id");
  if (error) {
    console.error("roadmap counts failed", error);
    return NextResponse.json({ counts: aggregate([]), mine: {} });
  }

  const rows = data ?? [];
  const counts = aggregate(rows);
  const mine: Record<string, number> = {};
  if (VOTER_RE.test(voter)) {
    for (const r of rows) if (r.voter_id === voter) mine[r.item_id] = r.vote;
  }
  return NextResponse.json({ counts, mine });
}

// POST /api/roadmap  { itemId, voter, vote: 1 | -1 | 0 }
// vote 0 clears this voter's vote on the item. Returns the item's new counts.
export async function POST(req: NextRequest) {
  let body: { itemId?: string; voter?: string; vote?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const itemId = String(body.itemId ?? "");
  const voter = String(body.voter ?? "");
  const vote = Number(body.vote);

  if (!VOTABLE_IDS.has(itemId)) {
    return NextResponse.json({ ok: false, error: "unknown_item" }, { status: 400 });
  }
  if (!VOTER_RE.test(voter)) {
    return NextResponse.json({ ok: false, error: "bad_voter" }, { status: 400 });
  }
  if (vote !== 1 && vote !== -1 && vote !== 0) {
    return NextResponse.json({ ok: false, error: "bad_vote" }, { status: 400 });
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

  const supabase = client();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 503 });
  }

  if (vote === 0) {
    const { error } = await supabase
      .from("roadmap_votes")
      .delete()
      .eq("item_id", itemId)
      .eq("voter_id", voter);
    if (error) {
      console.error("roadmap unvote failed", error);
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("roadmap_votes")
      .upsert(
        { item_id: itemId, voter_id: voter, vote, updated_at: new Date().toISOString() },
        { onConflict: "item_id,voter_id" },
      );
    if (error) {
      console.error("roadmap vote failed", error);
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
  }

  // Return the item's fresh totals so the client is authoritative, not optimistic.
  const { data, error: readErr } = await supabase
    .from("roadmap_votes")
    .select("vote")
    .eq("item_id", itemId);
  if (readErr) {
    return NextResponse.json({ ok: true }); // vote landed; client keeps optimistic count
  }
  const up = (data ?? []).filter((r) => r.vote === 1).length;
  const down = (data ?? []).filter((r) => r.vote === -1).length;
  return NextResponse.json({ ok: true, counts: { up, down }, mine: vote || undefined });
}
