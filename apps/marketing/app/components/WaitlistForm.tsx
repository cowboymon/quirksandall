"use client";

import { useState } from "react";

type Tone = "light" | "dark";

export default function WaitlistForm({
  source,
  tone = "light",
}: {
  source: "hero" | "footer";
  tone?: Tone;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const dark = tone === "dark";
  const noteColor = dark ? "text-card-dark-label" : "text-text-muted";

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
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className={`text-base font-medium ${dark ? "text-card-dark-text" : "text-foreground"}`}>
        You&apos;re on the list. We&apos;ll be in touch when it&apos;s live.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-md">
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
  );
}
