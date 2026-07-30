"use client";

import { useState } from "react";
import { track } from "../lib/pirsch";
import { prefersPawSwipe } from "../lib/anim";

type Tone = "light" | "dark";

export default function WaitlistForm({
  source,
  tone = "light",
  intro,
}: {
  source: "hero" | "footer";
  tone?: Tone;
  intro?: string;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "swiping" | "done" | "error">("idle");

  const dark = tone === "dark";
  const noteColor = dark ? "text-card-dark-label" : "text-text-muted";
  const swiping = status === "swiping";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, company }),
      });
      if (res.ok) {
        track("Waitlist Joined", { source });
        if (prefersPawSwipe()) {
          setStatus("swiping");
          window.setTimeout(() => setStatus("done"), 1200);
        } else {
          setStatus("done");
        }
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const confirmation = (
    <div className="flex items-center justify-center gap-3 sm:justify-start">
      <span
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          dark ? "bg-card-dark-deep text-card-dark-label" : "bg-secondary text-primary"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <p className={`text-base font-medium ${dark ? "text-card-dark-text" : "text-foreground"}`}>
        You&apos;re on the list. We&apos;ll be in touch when it&apos;s live.
      </p>
    </div>
  );

  if (status === "done") {
    return <div className="animate-confirm-drop">{confirmation}</div>;
  }

  return (
    <div className="w-full max-w-md">
      {intro && (
        <p
          className={`mb-6 text-center text-lg leading-relaxed ${
            dark ? "text-card-dark-text/85" : "text-text-muted"
          }`}
        >
          {intro}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className={swiping ? "animate-bar-knock pointer-events-none" : ""} aria-hidden={swiping}>
        <div className="flex flex-col gap-2.5 sm:flex-row">
        <label className="sr-only" htmlFor={`waitlist-email-${source}`}>
          Email address
        </label>
        <input
          id={`waitlist-email-${source}`}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`min-w-0 flex-1 rounded-button border px-4 py-3 text-sm outline-none transition-colors ${
            dark
              ? "border-transparent bg-card-bg text-foreground placeholder:text-text-muted focus:border-card-dark-label"
              : "border-border bg-card-bg text-foreground placeholder:text-text-muted focus:border-primary"
          }`}
        />
        {/* Honeypot — hidden from real users, catches bots. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={`shrink-0 rounded-button px-5 py-3 text-sm font-medium transition-colors disabled:opacity-70 ${
            dark
              ? "bg-card-bg text-foreground hover:bg-secondary"
              : "bg-button text-card-dark-text hover:bg-button-pressed"
          }`}
        >
          {status === "loading" ? "Adding…" : "Notify me"}
        </button>
      </div>

        <p className={`mt-2.5 text-left text-sm ${noteColor}`}>
          {status === "error"
            ? "Something went wrong — please try again."
            : "We'll email you once. Nothing else."}
        </p>
      </form>

      {/* Clawed cat arm sweeps up from the bottom of the maroon box (its parent
         provides relative + overflow-hidden) — desktop only. */}
      {swiping && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/cat-arm-claws.svg"
          alt=""
          aria-hidden
          className="animate-paw-swat pointer-events-none absolute -bottom-[320px] left-1/2 z-10 -ml-[60px] w-[120px] drop-shadow-[0_10px_16px_rgba(0,0,0,0.32)]"
        />
      )}
    </div>
  );
}
