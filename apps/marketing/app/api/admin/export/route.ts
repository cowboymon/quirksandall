import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { COLUMNS } from "../../../roadmap/data";
import { isAuthorizedAdmin, unauthorizedResponse } from "../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Primary auth gate is middleware.ts (Basic Auth on /api/admin/*), but this
// route re-checks the same credentials itself as defense-in-depth: a matcher
// typo or a config change in middleware.ts must not silently expose this
// data export.

function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection: a cell beginning with = + - @ (or
  // tab/CR) can execute as a formula when the CSV is opened in Excel/Sheets.
  // A suggestion or email is attacker-controlled, so prefix a single quote to
  // force it to be treated as text.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: (unknown[])[]): string {
  const lines = [headers.map(cell).join(",")];
  for (const r of rows) lines.push(r.map(cell).join(","));
  return lines.join("\r\n");
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const TITLES: Record<string, string> = Object.fromEntries(
  COLUMNS.flatMap((c) => c.items.map((i) => [i.id, i.title])),
);
const STATUS: Record<string, string> = Object.fromEntries(
  COLUMNS.flatMap((c) => c.items.map((i) => [i.id, c.status])),
);

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) return unauthorizedResponse();

  const type = req.nextUrl.searchParams.get("type") ?? "waitlist";

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }
  const supabase = createClient(url, key);

  let csv = "";
  let name = "export";

  if (type === "waitlist") {
    const { data, error } = await supabase
      .from("waitlist")
      .select("email, source, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("admin export: waitlist query failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    csv = toCsv(
      ["email", "source", "created_at"],
      (data ?? []).map((r) => [r.email, r.source, r.created_at]),
    );
    name = "waitlist";
  } else if (type === "suggestions") {
    const { data, error } = await supabase
      .from("roadmap_suggestions")
      .select("suggestion, email, theme, status, notified_at, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("admin export: suggestions query failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    csv = toCsv(
      ["suggestion", "email", "theme", "status", "notified_at", "created_at"],
      (data ?? []).map((r) => [r.suggestion, r.email, r.theme, r.status, r.notified_at, r.created_at]),
    );
    name = "suggestions";
  } else if (type === "votes") {
    const { data, error } = await supabase.from("roadmap_votes").select("item_id, vote");
    if (error) {
      console.error("admin export: votes query failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    const counts: Record<string, number> = {};
    for (const id of Object.keys(TITLES)) counts[id] = 0;
    for (const v of data ?? []) if (v.vote === 1 && v.item_id in counts) counts[v.item_id] += 1;
    const rows = Object.entries(counts)
      .map(([id, up]) => [TITLES[id] ?? id, STATUS[id] ?? "", up] as unknown[])
      .sort((a, b) => (b[2] as number) - (a[2] as number));
    csv = toCsv(["idea", "bucket", "wants"], rows);
    name = "roadmap-votes";
  } else {
    return NextResponse.json({ error: "unknown_type" }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${stamp()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
