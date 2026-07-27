"use client";

// Vendor-agnostic analytics wrapper for the web recipient page. Mixpanel is
// referenced ONLY here — swapping vendors is a change in this file alone.
//
// The recipient page is opened by sitters/vets/backup contacts who are NOT
// signed-up users, so this is ANONYMOUS tracking: no identify(), no PII. We
// measure the growth engine (§3.2) — how often shared links are actually opened
// — with a couple of non-identifying properties. Event names follow the same
// snake_case convention as the mobile app.
//
// Token: NEXT_PUBLIC_MIXPANEL_TOKEN. With no token set, every call is a no-op.
import mixpanel from "mixpanel-browser";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let ready = false;

export const WebAnalyticsEvent = {
  RecipientPageViewed: "recipient_page_viewed",
} as const;
export type WebAnalyticsEventName = (typeof WebAnalyticsEvent)[keyof typeof WebAnalyticsEvent];

function ensureInit(): boolean {
  if (ready) return true;
  if (!TOKEN || typeof window === "undefined") return false;
  // api_host: the project lives on EU data residency — events must go to the
  // EU ingestion endpoint or they silently land in the US region.
  mixpanel.init(TOKEN, { track_pageview: false, persistence: "localStorage", api_host: "https://api-eu.mixpanel.com" });
  ready = true;
  return true;
}

export function trackWeb(event: WebAnalyticsEventName, props?: Record<string, string | number | boolean>) {
  if (!ensureInit()) return;
  mixpanel.track(event, props);
}
