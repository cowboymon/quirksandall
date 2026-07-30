"use client";

import { useState } from "react";
import { track } from "../lib/pirsch";
import { prefersPawSwipe } from "../lib/anim";

export default function SuggestForm() {
  const [suggestion, setSuggestion] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "swiping" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/roadmap/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion, email, company }),
      });
      if (res.ok) {
        track("Suggestion Submitted");
        if (prefersPawSwipe()) {
          setStatus("swiping");
          window.setTimeout(() => setStatus("done"), 1600);
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

  const swiping = status === "swiping";
  const field =
    "w-full rounded-button border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary";

  return (
    <div className="relative mx-auto max-w-xl overflow-hidden rounded-card border border-border bg-card-bg p-6 text-left shadow-sm sm:p-8">
      <h2 className="font-tanker text-2xl leading-tight text-foreground">Missing something?</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        Tell us what would make Quirks &amp; All better for your pet — we read every one.
      </p>

      {/* Hold the form's height only while the paw swipes, so the card doesn't
         jump mid-animation; once done, collapse to the compact confirmation. */}
      <div className={`relative mt-5 ${swiping ? "sm:min-h-[184px]" : ""}`}>
        {status === "done" ? (
          <div className="animate-confirm-drop flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <p className="text-base font-medium text-foreground">
              Got it — thank you. Every idea gets read.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className={swiping ? "animate-bar-knock pointer-events-none" : ""}
            aria-hidden={swiping}
          >
              <label className="sr-only" htmlFor="suggest-text">
                Your idea
              </label>
              <textarea
                id="suggest-text"
                required
                rows={3}
                maxLength={2000}
                placeholder="Your idea…"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                className={`${field} resize-none`}
              />
              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                <label className="sr-only" htmlFor="suggest-email">
                  Email (optional)
                </label>
                <input
                  id="suggest-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Email for a reply (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`min-w-0 flex-1 ${field}`}
                />
                {/* Honeypot */}
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
                  disabled={status === "loading" || swiping}
                  className="shrink-0 rounded-button bg-button px-5 py-3 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed disabled:opacity-70"
                >
                  {status === "loading" ? "Sending…" : "Send idea"}
                </button>
              </div>
              <p className="mt-3 text-sm text-text-muted">
                {status === "error"
                  ? "Something went wrong — please try again."
                  : "No account needed. Email is optional."}
              </p>
          </form>
        )}
      </div>

      {/* The arm only exists during the swipe. Anchored to the card and clipped
         by its overflow-hidden, so the cut end of the arm is never visible —
         it reads as reaching up from beneath the form. */}
      {swiping && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/cat-arm.svg"
          alt=""
          aria-hidden
          className="animate-paw-swat pointer-events-none absolute -bottom-[540px] left-[40%] z-10 w-[128px] drop-shadow-[0_8px_14px_rgba(81,0,0,0.22)]"
        />
      )}
    </div>
  );
}
