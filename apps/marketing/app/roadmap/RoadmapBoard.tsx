"use client";

import { useEffect, useState } from "react";
import { COLUMNS, DOT, type CountsMap } from "./data";

// Anonymous per-browser id, kept in localStorage. Not a person, no PII —
// just enough to let someone change or clear their own vote.
function getVoterId(): string {
  const KEY = "qa_voter";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

export default function RoadmapBoard() {
  const [voter, setVoter] = useState<string>("");
  const [counts, setCounts] = useState<CountsMap>({});
  const [mine, setMine] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const id = getVoterId();
    setVoter(id);
    fetch(`/api/roadmap?voter=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.counts) setCounts(d.counts);
        if (d?.mine) setMine(d.mine);
      })
      .catch(() => {});
  }, []);

  async function cast(itemId: string, dir: 1 | -1) {
    if (!voter || busy) return;
    const current = mine[itemId] ?? 0;
    const next = current === dir ? 0 : dir; // click your current vote again to clear it
    setBusy(itemId);

    // Optimistic update.
    const prevCounts = counts[itemId] ?? { up: 0, down: 0 };
    const optimistic = { ...prevCounts };
    if (current === 1) optimistic.up -= 1;
    if (current === -1) optimistic.down -= 1;
    if (next === 1) optimistic.up += 1;
    if (next === -1) optimistic.down += 1;
    setCounts((c) => ({ ...c, [itemId]: optimistic }));
    setMine((m) => ({ ...m, [itemId]: next }));

    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, voter, vote: next }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.counts) setCounts((c) => ({ ...c, [itemId]: data.counts }));
    } catch {
      // Roll back on failure.
      setCounts((c) => ({ ...c, [itemId]: prevCounts }));
      setMine((m) => ({ ...m, [itemId]: current }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {COLUMNS.map((col) => (
        <div key={col.status}>
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: DOT[col.tone] }}
              aria-hidden
            />
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              {col.status}
            </h2>
          </div>
          <ul className="mt-5 flex flex-col gap-4">
            {col.items.map((item) => {
              const c = counts[item.id] ?? { up: 0, down: 0 };
              const v = mine[item.id] ?? 0;
              return (
                <li key={item.id} className="rounded-card border border-border bg-card-bg p-5">
                  <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{item.desc}</p>
                  <div className="mt-4">
                    <VoteButton
                      active={v === 1}
                      count={c.up}
                      disabled={busy === item.id}
                      onClick={() => cast(item.id, 1)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function VoteButton({
  active,
  count,
  disabled,
  onClick,
}: {
  active: boolean;
  count: number;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? "Remove your vote" : "Want this"}
      className={`inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors disabled:opacity-60 ${
        active
          ? "border-primary bg-secondary text-primary"
          : "border-border bg-card-bg text-text-muted hover:border-primary/50 hover:text-foreground"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M7 10v11" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a1.5 1.5 0 0 1 3 .88Z" />
      </svg>
      <span>{count}</span>
    </button>
  );
}
