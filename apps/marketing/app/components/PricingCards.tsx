"use client";

import { useState } from "react";
import { site } from "../site";
import { track } from "../lib/pirsch";
import TrackedLink from "./TrackedLink";

const FREE = [
  "Pet ID, commands & allergies",
  "PIN-gated emergency contacts",
  "Feeding times & one live link",
  "Missing-pet poster",
];

const PRO = [
  "Full daily routine — walks, sleep, bathroom",
  "The soft stuff — fears, no-go zones, temperament",
  "A separate live link per stand-in",
  "Unlimited pets",
  "Everything in Free, always included",
];

function Tick({ tone }: { tone: string }) {
  return (
    <svg
      className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Free stays a static card; Pro carries an Annual/Lifetime toggle that swaps
// the whole card's theme — light for Annual, deep crimson for Lifetime — so
// choosing "forever" reads as the premium pick. Defaults to Annual.
export default function PricingCards() {
  const [plan, setPlan] = useState<"annual" | "lifetime">("annual");
  const life = plan === "lifetime";

  function select(next: "annual" | "lifetime") {
    if (next === plan) return;
    setPlan(next);
    track("Pricing Plan Toggled", { plan: next });
  }

  return (
    <div className="mt-10 grid items-stretch gap-6 md:grid-cols-5">
      {/* Free */}
      <div className="flex flex-col rounded-card border border-border bg-card-bg p-8 md:col-span-2">
        <h3 className="text-lg font-bold text-foreground">Free</h3>
        <p className="mt-1 text-sm text-text-muted">Everything to hand off one pet.</p>
        <p className="mt-6 font-tanker text-4xl text-foreground">$0</p>
        <p className="mt-1 text-xs text-text-muted">No card, ever.</p>
        <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-text-muted">
          {FREE.map((f) => (
            <li key={f} className="flex gap-2.5">
              <Tick tone="text-success" />
              {f}
            </li>
          ))}
        </ul>
        <TrackedLink
          href="/#get"
          event="Get Notified Clicked"
          meta={{ location: "pricing-free" }}
          className="mt-8 rounded-button border border-border bg-background px-5 py-3.5 text-center text-sm font-medium text-foreground transition-colors hover:border-primary"
        >
          Get notified
        </TrackedLink>
        <p className="mt-4 min-h-[2.5rem] text-center text-xs text-text-muted">
          Free forever. No subscription.
        </p>
      </div>

      {/* Pro — theme swaps with the toggle */}
      <div
        className={`flex flex-col rounded-card p-8 ring-2 ring-primary transition-colors duration-300 md:col-span-3 ${
          life
            ? "border border-transparent bg-card-dark text-card-dark-text"
            : "border border-border bg-card-bg text-foreground"
        }`}
      >
        <h3 className="text-lg font-bold">Pro</h3>

        {/* segmented toggle */}
        <div
          role="tablist"
          aria-label="Choose a Pro plan"
          className={`mt-5 flex rounded-full p-1 text-sm font-medium transition-colors ${
            life ? "bg-card-dark-deep" : "bg-secondary/60"
          }`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={!life}
            onClick={() => select("annual")}
            className={`flex-1 rounded-full px-4 py-2 text-center transition-colors ${
              !life ? "bg-card-dark text-card-dark-text shadow-sm" : "text-card-dark-label"
            }`}
          >
            Annual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={life}
            onClick={() => select("lifetime")}
            className={`flex-1 rounded-full px-4 py-2 text-center transition-colors ${
              life ? "bg-background text-foreground shadow-sm" : "text-text-muted"
            }`}
          >
            Lifetime
          </button>
        </div>

        {/* price */}
        <p className="mt-6 flex items-baseline gap-2">
          <span className="font-tanker text-5xl leading-none">
            {life ? site.pricing.lifetime : site.pricing.annual}
          </span>
          <span className={`text-base ${life ? "text-card-dark-label" : "text-text-muted"}`}>
            {life ? "one-time" : "/year"}
          </span>
        </p>
        <p className={`mt-1.5 text-xs ${life ? "text-card-dark-label" : "text-text-muted"}`}>
          {life ? "Pay once. Yours forever." : "Auto-renews yearly. Cancel anytime."}
        </p>

        <ul
          className={`mt-6 flex flex-1 flex-col gap-3 text-sm ${
            life ? "text-card-dark-text/90" : "text-text-muted"
          }`}
        >
          {PRO.map((f) => (
            <li key={f} className="flex gap-2.5">
              <Tick tone={life ? "text-card-dark-label" : "text-success"} />
              {f}
            </li>
          ))}
        </ul>

        <TrackedLink
          href="/#get"
          event="Get Notified Clicked"
          meta={{ location: `pricing-${plan}` }}
          className={`mt-8 rounded-button px-5 py-3.5 text-center text-sm font-semibold transition-colors ${
            life
              ? "bg-background text-foreground hover:bg-secondary"
              : "bg-button text-card-dark-text hover:bg-button-pressed"
          }`}
        >
          Get notified at launch
        </TrackedLink>
        <p className={`mt-4 min-h-[2.5rem] text-center text-xs ${life ? "text-card-dark-label" : "text-text-muted"}`}>
          {life
            ? "One-time purchase, in-app. Unlocks account-wide."
            : "Billed yearly through the app store. Cancel anytime."}
        </p>
      </div>
    </div>
  );
}
