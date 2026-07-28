"use client";

import { useState } from "react";

export default function SuggestForm() {
  const [suggestion, setSuggestion] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

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
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="mx-auto flex max-w-md items-center justify-center gap-3 text-left">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-bg text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="text-base font-medium text-foreground">
          Got it — thank you. Every idea gets read.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-lg text-left">
      <label className="sr-only" htmlFor="suggest-text">
        Your idea
      </label>
      <textarea
        id="suggest-text"
        required
        rows={3}
        maxLength={2000}
        placeholder="What would make Quirks &amp; All better for your pet?"
        value={suggestion}
        onChange={(e) => setSuggestion(e.target.value)}
        className="w-full resize-none rounded-card border border-transparent bg-card-bg px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary"
      />
      <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
        <label className="sr-only" htmlFor="suggest-email">
          Email (optional)
        </label>
        <input
          id="suggest-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Email if you'd like a reply (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-button border border-transparent bg-card-bg px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary"
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
          disabled={status === "loading"}
          className="shrink-0 rounded-button bg-button px-5 py-3 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed disabled:opacity-70"
        >
          {status === "loading" ? "Sending…" : "Send idea"}
        </button>
      </div>
      <p className="mt-2.5 text-sm text-foreground/70">
        {status === "error"
          ? "Something went wrong — please try again."
          : "No account needed. Email is optional."}
      </p>
    </form>
  );
}
