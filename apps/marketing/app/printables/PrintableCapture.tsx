"use client";

import { useEffect, useState } from "react";
import { track } from "../lib/pirsch";

const KEY = "qa_printable_capture"; // once dismissed or submitted, don't nag again

// Post-download ask: after the print dialog closes (afterprint), slide in a
// small, dismissible card inviting the reader onto the list. No gate on the
// download itself — this fires only once they've already got the value.
export default function PrintableCapture({ slug }: { slug: string }) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    const seen = () => {
      try {
        return localStorage.getItem(KEY) === "1";
      } catch {
        return false;
      }
    };
    const onAfterPrint = () => {
      if (!seen()) setShow(true);
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  // Escape closes the modal while it's open.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  function remember() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  }

  function dismiss() {
    remember();
    setShow(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "printable", company }),
      });
      if (!res.ok) throw new Error("failed");
      track("Waitlist Joined", { source: "printable", template: slug });
      remember();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (!show) return null;

  return (
    <div
      className="print-hide fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Join the list"
    >
      <div
        className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
        aria-hidden
        onClick={dismiss}
      />
      <div className="relative w-full max-w-sm animate-confirm-drop rounded-2xl border border-border bg-card-bg p-5 shadow-[0_16px_44px_rgba(81,0,0,0.22)]">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 text-text-muted transition-colors hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {status === "done" ? (
          <p className="pr-6 font-tanker text-xl leading-none text-foreground">
            You&apos;re in. Talk soon.
          </p>
        ) : (
          <>
            <p className="pr-6 font-tanker text-xl leading-none text-foreground">Hope that helped.</p>
            <p className="mt-2.5 text-sm leading-relaxed text-text-muted">
              Quirks &amp; All is one always-current link that saves you filling this in by hand every
              time. Leave your email for launch news and the occasional handover tip.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/balloon-pink.png"
              alt=""
              aria-hidden
              className="mx-auto mt-4 h-16 w-16 -rotate-6 object-contain"
            />
            <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-2">
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-button border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-primary"
              />
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
                className="rounded-button bg-button px-4 py-2.5 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed disabled:opacity-70"
              >
                {status === "loading" ? "Adding…" : "Get notified"}
              </button>
            </form>
            <p className="mt-2 text-xs text-text-muted">
              {status === "error"
                ? "Something went wrong — please try again."
                : "No spam, unsubscribe anytime."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
