// Vendor-agnostic analytics wrapper. Mixpanel is referenced ONLY in this file —
// swapping vendors (e.g. to PostHog) is a change here, never at a call site.
//
// Product analytics only (Spec §8.1): event names + non-PII props. NEVER pass
// pet content, contact details, or PINs. This is first-party analytics, covered
// by the privacy policy — it is NOT gated by the insurance-offers consent, and
// (per the Mixpanel setup) the app is AU-focused with no EU/CA consent gate.
//
// Conventions (Mixpanel skill): snake_case event names, lowercase string values,
// numerics unquoted, no `$`/`mp_` prefixes, omit properties that don't apply.
//
// Token comes from EXPO_PUBLIC_MIXPANEL_TOKEN. With no token set, every call is
// a safe no-op, so the app runs fine in dev/CI without analytics configured.
import { Mixpanel } from "mixpanel-react-native";

const TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

let mp: Mixpanel | null = null;
let initPromise: Promise<void> | null = null;

// The full event vocabulary lives here so call sites can't typo an event name.
// Values are the wire names sent to Mixpanel (snake_case, object_verb).
export const AnalyticsEvent = {
  SignUpCompleted: "sign_up_completed",
  PetCreated: "pet_created",
  ShareLinkCreated: "share_link_created", // Value Moment
  PaywallViewed: "paywall_viewed",
  PurchaseStarted: "purchase_started",
  PurchaseCompleted: "purchase_completed",
  PurchaseRestored: "purchase_restored",
} as const;
export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type Props = Record<string, string | number | boolean>;

export function initAnalytics(): Promise<void> {
  if (initPromise) return initPromise;
  if (!TOKEN) {
    initPromise = Promise.resolve(); // no token → analytics disabled
    return initPromise;
  }
  const instance = new Mixpanel(TOKEN, false /* trackAutomaticEvents */);
  initPromise = instance
    .init()
    .then(() => { mp = instance; })
    .catch(() => { mp = null; });
  return initPromise;
}

export function track(event: AnalyticsEventName, props?: Props) {
  mp?.track(event, props);
}

// Tie events to the signed-in owner (their Supabase user id) — no other PII.
// Call on every login AND every app re-open while logged in.
export function identify(distinctId: string) {
  mp?.identify(distinctId);
}

// Set profile attributes — call AFTER identify(). Non-PII only.
export function setUserProps(props: Props) {
  mp?.getPeople().set(props);
}

// Clear identity on sign-out so the next account isn't merged into this one.
export function resetAnalytics() {
  mp?.reset();
}
