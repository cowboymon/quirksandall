import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { COLUMNS } from "../roadmap/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always fresh; never cached

// Keep it out of search engines even though it's behind auth.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const TITLES: Record<string, string> = Object.fromEntries(
  COLUMNS.flatMap((c) => c.items.map((i) => [i.id, i.title])),
);
const STATUS: Record<string, string> = Object.fromEntries(
  COLUMNS.flatMap((c) => c.items.map((i) => [i.id, c.status])),
);

// Mask an email for on-screen display so a glance / screen-share doesn't leak
// the full address. Full addresses are available via the CSV download.
function maskEmail(email: string | null): string {
  if (!email) return "—";
  const at = email.indexOf("@");
  if (at < 1) return "•••";
  const first = email[0];
  const domain = email.slice(at);
  return `${first}••••${domain}`;
}

function fmt(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

type Loaded<T> = { rows: T[]; error: string | null };

async function load() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);

  const [waitlistRes, votesRes, suggestionsRes] = await Promise.all([
    supabase
      .from("waitlist")
      .select("email, source, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("roadmap_votes").select("item_id, vote"),
    supabase
      .from("roadmap_suggestions")
      .select("suggestion, email, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const waitlist: Loaded<{ email: string; source: string | null; created_at: string }> = {
    rows: waitlistRes.data ?? [],
    error: waitlistRes.error?.message ?? null,
  };

  // Aggregate votes → per-item up count, seeded with every known item.
  const counts: Record<string, number> = {};
  for (const id of Object.keys(TITLES)) counts[id] = 0;
  for (const v of votesRes.data ?? []) {
    if (v.vote === 1 && v.item_id in counts) counts[v.item_id] += 1;
  }
  const votes = {
    rows: Object.entries(counts)
      .map(([id, up]) => ({ id, up, title: TITLES[id] ?? id, status: STATUS[id] ?? "" }))
      .sort((a, b) => b.up - a.up),
    error: votesRes.error?.message ?? null,
  };

  const suggestions: Loaded<{ suggestion: string; email: string | null; created_at: string }> = {
    rows: suggestionsRes.data ?? [],
    error: suggestionsRes.error?.message ?? null,
  };

  return { waitlist, votes, suggestions };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-border bg-card-bg p-5">
      <p className="font-tanker text-3xl text-foreground">{value}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
    </div>
  );
}

function DownloadCsv({ type, label }: { type: string; label: string }) {
  return (
    <a
      href={`/api/admin/export?type=${type}`}
      className="inline-flex items-center gap-1.5 rounded-button border border-border bg-card-bg px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
      {label}
    </a>
  );
}

function TableNote({ error, name }: { error: string | null; name: string }) {
  if (!error) return null;
  const missing = /relation .* does not exist|could not find the table|schema cache/i.test(error);
  return (
    <p className="mt-3 rounded-card border border-caution/40 bg-caution/10 px-4 py-3 text-sm text-caution">
      {missing
        ? `The ${name} table doesn't exist yet — run its migration in Supabase.`
        : `Couldn't load ${name}: ${error}`}
    </p>
  );
}

export default async function AdminPage() {
  const data = await load();

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="font-tanker text-4xl text-foreground">Admin</h1>
        <p className="mt-4 text-text-muted">
          Supabase isn&apos;t configured. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_KEY</code> in the deployment.
        </p>
      </main>
    );
  }

  const { waitlist, votes, suggestions } = data;
  const totalVotes = votes.rows.reduce((n, r) => n + r.up, 0);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Quirks &amp; All</p>
          <h1 className="mt-2 font-tanker text-4xl text-foreground sm:text-5xl">Admin</h1>
        </div>
        <p className="text-sm text-text-muted">Live from Supabase · reload to refresh</p>
      </header>

      {/* Summary */}
      <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Waitlist signups" value={waitlist.error ? "—" : waitlist.rows.length} />
        <Stat label="Roadmap votes" value={votes.error ? "—" : totalVotes} />
        <Stat label="Suggestions" value={suggestions.error ? "—" : suggestions.rows.length} />
      </section>

      {/* Votes */}
      <section className="mt-14">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
          Roadmap votes
        </h2>
        <TableNote error={votes.error} name="roadmap_votes" />
        {!votes.error && (
          <div className="mt-4 overflow-hidden rounded-card border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 text-text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Idea</th>
                  <th className="px-4 py-2.5 font-medium">Bucket</th>
                  <th className="px-4 py-2.5 text-right font-medium">Wants</th>
                </tr>
              </thead>
              <tbody>
                {votes.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.title}</td>
                    <td className="px-4 py-2.5 text-text-muted">{r.status}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{r.up}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Suggestions */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Feature suggestions
          </h2>
          {!suggestions.error && suggestions.rows.length > 0 && (
            <DownloadCsv type="suggestions" label="Download CSV" />
          )}
        </div>
        <TableNote error={suggestions.error} name="roadmap_suggestions" />
        {!suggestions.error && suggestions.rows.length === 0 && (
          <p className="mt-4 text-sm text-text-muted">None yet.</p>
        )}
        {!suggestions.error && suggestions.rows.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {suggestions.rows.map((s, idx) => (
              <li key={idx} className="rounded-card border border-border bg-card-bg p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground">{s.suggestion}</p>
                <p className="mt-2 text-xs text-text-muted">
                  {fmt(s.created_at)}
                  {s.email ? ` · ${maskEmail(s.email)}` : " · no email"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Waitlist */}
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">Waitlist</h2>
          {!waitlist.error && waitlist.rows.length > 0 && (
            <DownloadCsv type="waitlist" label="Download CSV" />
          )}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Emails are masked on screen — download the CSV for the full addresses.
        </p>
        <TableNote error={waitlist.error} name="waitlist" />
        {!waitlist.error && waitlist.rows.length === 0 && (
          <p className="mt-4 text-sm text-text-muted">No signups yet.</p>
        )}
        {!waitlist.error && waitlist.rows.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-card border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 text-text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.rows.map((r, idx) => (
                  <tr key={idx} className="border-t border-border/60">
                    <td className="px-4 py-2.5 text-foreground">{maskEmail(r.email)}</td>
                    <td className="px-4 py-2.5 text-text-muted">{r.source ?? "—"}</td>
                    <td className="px-4 py-2.5 text-text-muted">{fmt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
