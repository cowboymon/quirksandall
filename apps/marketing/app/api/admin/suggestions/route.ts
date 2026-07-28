import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { STATUSES } from "../../../lib/themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth is handled upstream by middleware.ts (Basic Auth on /api/admin/*).
// Updates a suggestion's resolution status and/or its notified stamp.
export async function POST(req: NextRequest) {
  let body: { id?: string; status?: string; markNotified?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!(STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ ok: false, error: "bad_status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.markNotified !== undefined) {
    patch.notified_at = body.markNotified ? new Date().toISOString() : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "nothing_to_update" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "unconfigured" }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.from("roadmap_suggestions").update(patch).eq("id", id);
  if (error) {
    console.error("suggestion update failed", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
