// Crash + error reporting. Sentry is referenced ONLY in this file, the same
// rule analytics.ts follows, so swapping vendors is a change here and nowhere
// else.
//
// No DSN set → every function is a no-op and Sentry is never initialised, so
// dev, CI and anyone building without the env var get an app that behaves
// identically minus the reporting. Same shape as the Mixpanel wrapper.
//
// PRIVACY: this app's crashes can carry pet and owner data in scope, so the
// defaults are turned down deliberately —
//   • sendDefaultPii stays off, so no IP addresses or request bodies,
//   • breadcrumbs from console/network are dropped (URLs on the recipient path
//     contain share tokens, which are the credential for a pet's profile),
//   • users are identified by Supabase user id only, never email or name.
// Anything added here should be checked against that list first.
import * as Sentry from "@sentry/react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let started = false;

export function initErrorReporting() {
  if (started || !DSN) return;
  started = true;
  Sentry.init({
    dsn: DSN,
    // Errors only. Performance tracing is a separate cost and a separate
    // privacy surface (it records URLs); turn it on deliberately if ever.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    environment: __DEV__ ? "development" : "production",
    // Dev crashes go to the red box and the terminal, where they're more
    // useful — no reason to spend quota on them or to pollute the issue list
    // with errors that were never shipped.
    enabled: !__DEV__,
    beforeBreadcrumb: (crumb) => {
      // A share-link URL is the credential for a pet's whole profile; a
      // network or console breadcrumb would ship one — plus every Supabase
      // filter and RevenueCat/Mixpanel payload — into an issue.
      //
      // React Native's SDK tags network calls "http", not "xhr"/"fetch" like
      // the browser SDK does — confirmed against a real captured breadcrumb,
      // which is how this was caught: the crash-test trace on build 29 showed
      // full Supabase query strings under Type: http, Category: http, sailing
      // straight past a filter that only checked for xhr/fetch. Kept those
      // two as well since a future SDK version or a web build could still use
      // them.
      if (["console", "xhr", "fetch", "http"].includes(crumb.category ?? "")) return null;
      return crumb;
    },
  });
}

/** Attach the signed-in owner so an issue can be traced to an account.
 * Supabase user id only — the id is meaningless outside our own DB, whereas an
 * email in Sentry is personal data sitting in a third-party system. */
export function identifyForErrors(userId: string | null) {
  if (!started) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/** Report something we caught and handled, so it isn't invisible.
 * `where` is a short stable label ("share_link_create"), not a message. */
export function reportError(where: string, e: unknown) {
  if (!started) {
    if (__DEV__) console.warn(`[${where}]`, e);
    return;
  }
  Sentry.captureException(e instanceof Error ? e : new Error(String(e)), {
    tags: { where },
  });
}
