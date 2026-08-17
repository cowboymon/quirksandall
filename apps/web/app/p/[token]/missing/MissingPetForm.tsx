"use client";

import { useState } from "react";
import { possessive, isSafeHttpsUrl } from "@quirksandall/shared";
import { MapPin, CalendarBlank, Eye } from "@phosphor-icons/react";

type Props = { token: string; petName: string; ownerName: string; photoUrl: string | null };

const todayIso = () => new Date().toISOString().split("T")[0];

export default function MissingPetForm({ token, petName, ownerName, photoUrl }: Props) {
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
      <main className="min-h-screen bg-background px-6 pt-8 pb-8">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-tanker text-2xl font-normal leading-tight text-foreground">
            Alert sent.
          </h1>
          <p className="mt-1.5 font-satoshi text-sm leading-snug text-text-muted">
            {ownerName} has been sent what you entered, and knows to check their phone.
          </p>

          {posterUrl ? (
            <a
              href={posterUrl}
              download={`${(petName || "pet").toLowerCase()}-missing-poster.png`}
              className="mt-5 flex h-11 items-center justify-center rounded-button font-satoshi text-sm font-bold"
              style={{ backgroundColor: "#510000", color: "#F8ECEE" }}
            >
              Download poster
            </a>
          ) : (
            <p className="mt-5 font-satoshi text-sm text-text-muted">
              The poster couldn't be generated, but {ownerName} has already been alerted.
            </p>
          )}

          {/* Sitter-facing, not the owner's — this is the person physically
              searching, so this is where actionable guidance actually helps.
              Shown after the alert's already sent so it never slows that
              down. Standard lost-pet-recovery advice, not anything specific
              to this app or pet. */}
          <div className="mt-5 rounded-card border p-4" style={{ borderColor: "#E5BEC4", backgroundColor: "#FFFFFF" }}>
            <p className="eyebrow text-foreground mb-2.5">What to do right now</p>
            <ol className="flex flex-col gap-2 font-satoshi text-sm text-text-muted list-decimal pl-4">
              <li>Don't chase — call their name calmly and crouch down. Chasing usually makes a scared animal run further.</li>
              <li>Check nearby hiding spots first: under decks, parked cars, bushes, before searching further out.</li>
              <li>Leave a door or gate open with their bed or food nearby — many pets find their own way back.</li>
              <li>Walk the immediate area calling their name every minute or so, and pause to listen.</li>
              <li>Knock on neighbours' doors directly — people notice more than they think to mention online.</li>
              <li>Once you have the poster, put it up in the streets right around where they were last seen first.</li>
            </ol>
          </div>

          <a href={`/p/${token}`} className="mt-3 block text-center font-satoshi text-sm text-text-muted underline">
            Back to {petName}'s info
          </a>
        </div>
      </main>
    );
  }

  return (
    // Back now moves with the rest of the content (part of the centered
    // block, right above the heading) rather than staying pinned at the
    // top separately from it.
    <main className="flex min-h-screen flex-col bg-background px-6 pt-8 pb-8">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-sm">
          <a href={`/p/${token}`} className="mb-3 block font-satoshi text-sm text-text-muted">
            ‹ Back
          </a>

          {/* Photo + heading, same identity-block pattern as the recipient
              page (photo beside the name) — ties this screen visually back
              to the profile the sitter just came from. */}
          <div className="flex items-center gap-3">
            {photoUrl && isSafeHttpsUrl(photoUrl) && (
              <img
                src={photoUrl}
                alt={petName}
                className="h-12 w-12 shrink-0 rounded-full border-2 object-cover"
                style={{ borderColor: "#E5BEC4" }}
              />
            )}
            <h1 className="font-tanker text-2xl font-normal leading-tight text-foreground">
              {petName} is missing
            </h1>
          </div>
          <p className="mt-2.5 font-satoshi text-sm leading-snug text-text-muted">
            Fill in what you know. {ownerName} will be alerted the moment you send this, and you'll get a
            printable poster with {petName}'s photo.
          </p>

          <div className="mt-5 flex flex-col gap-3.5">
            {/* Field text stays at text-base (16px) even though everything
                else on this page runs smaller — iOS Safari auto-zooms the
                viewport on focusing any input under 16px, which is worse
                than a slightly larger field. Labels use the app's standard
                eyebrow style (11px, muted grey) — matches every label on
                the recipient page (WEIGHT, SEX, etc.) rather than standing
                out in the heading's crimson. */}
            <div>
              <label className="eyebrow mb-1 block text-text-muted">Last seen where</label>
              <div className="relative flex items-center">
                <MapPin size={16} weight="duotone" color="#74555D" className="pointer-events-none absolute left-3" />
                <input
                  type="text"
                  value={lastSeenArea}
                  onChange={(e) => setLastSeenArea(e.target.value)}
                  placeholder="Newtown IGA @ 4:40pm"
                  className="field-placeholder-sm h-10 w-full rounded-button border pl-9 pr-3.5 font-satoshi text-base text-foreground"
                  style={{ borderColor: "#E5BEC4", backgroundColor: "#FFFFFF", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <label className="eyebrow mb-1 block text-text-muted">Last seen when</label>
              <div className="relative flex items-center">
                <CalendarBlank size={16} weight="duotone" color="#74555D" className="pointer-events-none absolute left-3" />
                <input
                  type="date"
                  value={lastSeenDate}
                  max={todayIso()}
                  onChange={(e) => setLastSeenDate(e.target.value)}
                  className="h-10 w-full rounded-button border pl-9 pr-3.5 font-satoshi text-base text-foreground"
                  // Native date inputs (esp. iOS Safari) bring their own chrome
                  // that can override height/width even with identical classes
                  // to the text input beside it — appearance:none plus an
                  // explicit border-box stop it from rendering a different size.
                  style={{ borderColor: "#E5BEC4", backgroundColor: "#FFFFFF", WebkitAppearance: "none", appearance: "none", boxSizing: "border-box", textAlign: "left" }}
                />
              </div>
            </div>

            <div>
              <label className="eyebrow mb-1 block text-text-muted">What they look like right now</label>
              <div className="relative">
                <Eye size={16} weight="duotone" color="#74555D" className="pointer-events-none absolute left-3 top-2.5" />
                <textarea
                  value={lookFor}
                  onChange={(e) => setLookFor(e.target.value)}
                  placeholder="Grey knit jumper, pink bedazzled leash, red collar underneath."
                  rows={2}
                  className="field-placeholder-sm w-full rounded-button border py-2 pl-9 pr-3.5 font-satoshi text-base text-foreground"
                  style={{ borderColor: "#E5BEC4", backgroundColor: "#FFFFFF", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {error && (
              <p className="font-satoshi text-sm" style={{ color: "#9A5050" }}>
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-button py-3 px-4 font-satoshi text-sm font-bold leading-snug disabled:opacity-50"
              style={{ backgroundColor: "#510000", color: "#F8ECEE" }}
            >
              {submitting ? "Sending…" : `Alert ${possessive(petName)} human & create the poster`}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
