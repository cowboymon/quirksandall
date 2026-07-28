"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEMES, UNTAGGED, STATUSES } from "../lib/themes";

export type Suggestion = {
  id: string;
  suggestion: string;
  email: string | null;
  created_at: string;
  theme: string | null;
  status: string;
  notified_at: string | null;
};

function fmt(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function SuggestionsAdmin({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      await fetch("/api/admin/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  // Group by theme, in a stable order (known themes, then Untagged).
  const known = new Set<string>(THEMES);
  const groups = new Map<string, Suggestion[]>();
  for (const t of THEMES) groups.set(t, []);
  groups.set(UNTAGGED, []);
  for (const s of suggestions) {
    const key = s.theme && known.has(s.theme) ? s.theme : UNTAGGED;
    groups.get(key)!.push(s);
  }
  const orderedGroups = [...THEMES, UNTAGGED]
    .map((t) => [t, groups.get(t)!] as const)
    .filter(([, items]) => items.length > 0);

  // People who asked to be told and haven't been yet.
  const toNotify = suggestions.filter((s) => s.email && s.status !== "new" && !s.notified_at);

  return (
    <div>
      {/* To-notify queue — full emails here so you can actually send the update. */}
      {toNotify.length > 0 && (
        <div className="mb-8 rounded-card border border-caution/40 bg-caution/10 p-4">
          <p className="text-sm font-bold text-caution">
            To notify ({toNotify.length}) — email them their update, then mark done
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {toNotify.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-foreground">
                  <span className="font-medium">{s.email}</span>{" "}
                  <span className="text-text-muted">· {s.status}</span>
                </span>
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => patch(s.id, { markNotified: true })}
                  className="rounded-button border border-border bg-card-bg px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 disabled:opacity-60"
                >
                  Mark notified
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {orderedGroups.map(([theme, items]) => (
          <div key={theme}>
            <h3 className="text-sm font-bold text-foreground">
              {theme} <span className="text-text-muted">· {items.length}</span>
            </h3>
            <ul className="mt-3 flex flex-col gap-3">
              {items.map((s) => (
                <li key={s.id} className="rounded-card border border-border bg-card-bg p-4">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{s.suggestion}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    {fmt(s.created_at)}
                    {s.email ? ` · ${maskEmail(s.email)}` : " · no email"}
                    {s.notified_at ? ` · notified ${fmt(s.notified_at)}` : ""}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {STATUSES.map((st) => {
                      const active = s.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={busy === s.id}
                          onClick={() => patch(s.id, { status: st })}
                          aria-pressed={active}
                          className={`rounded-button border px-2.5 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-60 ${
                            active
                              ? "border-primary bg-secondary text-primary"
                              : "border-border bg-card-bg text-text-muted hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                    {s.email && s.notified_at && (
                      <button
                        type="button"
                        disabled={busy === s.id}
                        onClick={() => patch(s.id, { markNotified: false })}
                        className="ml-1 text-xs text-text-muted underline underline-offset-2 hover:text-foreground disabled:opacity-60"
                      >
                        undo notified
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "•••";
  return `${email[0]}••••${email.slice(at)}`;
}
