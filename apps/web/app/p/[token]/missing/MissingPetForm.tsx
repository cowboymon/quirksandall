"use client";

import { useState } from "react";

type Props = { token: string; petName: string; ownerName: string };

const todayIso = () => new Date().toISOString().split("T")[0];

export default function MissingPetForm({ token, petName, ownerName }: Props) {
  const [lastSeenArea, setLastSeenArea] = useState("");
  // Poster templates parse lastSeenDate as ISO (templates.tsx's formatDate) —
  // a native date input hands that over directly, no MM/DD vs DD/MM parsing
  // ambiguity to get wrong under pressure.
  const [lastSeenDate, setLastSeenDate] = useState(todayIso());
  const [lookFor, setLookFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  const canSubmit = lastSeenArea.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/report-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lastSeenArea, lastSeenDate, lookFor }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error === "rate_limited"
          ? "Already sent recently — check with the owner directly if this is urgent."
          : "Couldn't send the alert. Try again, or call the owner directly.");
        return;
      }

      // Poster generation is a separate call so a failure here doesn't block
      // the part that actually matters — the owner's already been alerted.
      try {
        const posterRes = await fetch("/api/generate-poster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, format: "poster", lastSeenArea, lastSeenDate, lookFor, preview: false }),
        });
        if (posterRes.ok) {
          const blob = await posterRes.blob();
          setPosterUrl(URL.createObjectURL(blob));
        }
      } catch {
        /* Alert already sent; poster is a bonus, not worth surfacing an error for. */
      }

      setSent(true);
    } catch {
      setError("Couldn't send the alert. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-tanker text-3xl font-normal leading-tight text-foreground">
            {ownerName} has been alerted.
          </h1>
          <p className="mt-3 font-satoshi text-base leading-relaxed text-text-muted">
            They've been sent what you entered, and know to check their phone.
          </p>

          {posterUrl ? (
            <a
              href={posterUrl}
              download={`${(petName || "pet").toLowerCase()}-missing-poster.png`}
              className="mt-8 flex h-12 items-center justify-center rounded-button font-satoshi text-sm font-bold"
              style={{ backgroundColor: "#510000", color: "#F8ECEE" }}
            >
              Download poster
            </a>
          ) : (
            <p className="mt-8 font-satoshi text-sm text-text-muted">
              The poster couldn't be generated, but {ownerName} has already been alerted.
            </p>
          )}

          <a href={`/p/${token}`} className="mt-4 block text-center font-satoshi text-sm text-text-muted underline">
            Back to {petName}'s info
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <a href={`/p/${token}`} className="font-satoshi text-base text-text-muted">
          ‹ Back
        </a>

        <h1 className="mt-3 font-tanker text-3xl font-normal leading-tight text-foreground">
          {petName} is missing
        </h1>
        <p className="mt-3 font-satoshi text-base leading-relaxed text-text-muted">
          Fill in what you know. {ownerName} will be alerted the moment you send this, and you'll get a
          printable poster with {petName}'s photo.
        </p>

        <div className="mt-8 flex flex-col gap-5">
          <div>
            <label className="eyebrow mb-1.5 block text-foreground">Last seen where</label>
            <input
              type="text"
              value={lastSeenArea}
              onChange={(e) => setLastSeenArea(e.target.value)}
              placeholder="Newtown IGA @ 4:40pm"
              className="h-12 w-full rounded-button border px-4 font-satoshi text-base text-foreground"
              style={{ borderColor: "#E5BEC4", backgroundColor: "#FFFFFF", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label className="eyebrow mb-1.5 block text-foreground">Last seen when</label>
            <input
              type="date"
              value={lastSeenDate}
              max={todayIso()}
              onChange={(e) => setLastSeenDate(e.target.value)}
              className="h-12 w-full rounded-button border px-4 font-satoshi text-base text-foreground"
              // Native date inputs (esp. iOS Safari) bring their own chrome
              // that can override height/width even with identical classes
              // to the text input beside it — appearance:none plus an
              // explicit border-box stop it from rendering a different size.
              style={{ borderColor: "#E5BEC4", backgroundColor: "#FFFFFF", WebkitAppearance: "none", appearance: "none", boxSizing: "border-box", textAlign: "left" }}
            />
          </div>

          <div>
            <label className="eyebrow mb-1.5 block text-foreground">What they look like right now</label>
            <textarea
              value={lookFor}
              onChange={(e) => setLookFor(e.target.value)}
              placeholder="Grey knit jumper, pink bedazzled leash, red collar underneath."
              rows={3}
              className="w-full rounded-button border px-4 py-3 font-satoshi text-base text-foreground"
              style={{ borderColor: "#E5BEC4", backgroundColor: "#FFFFFF", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <p className="font-satoshi text-sm" style={{ color: "#9A5050" }}>
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="h-12 rounded-button font-satoshi text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: "#510000", color: "#F8ECEE" }}
          >
            {submitting ? "Sending…" : `Alert ${ownerName} & create poster`}
          </button>
        </div>
      </div>
    </main>
  );
}
