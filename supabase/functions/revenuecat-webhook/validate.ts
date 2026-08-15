// Pure validation helpers for the RevenueCat webhook payload — no Deno-
// specific imports, so this file is also importable from a Node/Vitest test
// runner to unit test the validation logic directly.

// Constant-time-ish string compare so the shared-secret check doesn't leak
// timing information about how many leading characters matched. Mirrors the
// same pattern used for the admin Basic Auth compare elsewhere in the repo.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// app_user_id must be a Supabase auth UUID (the app always calls
// Purchases.logIn with auth.uid()) — never trust an arbitrary attacker
// -chosen string into a `.eq("id", userId)` update, even though PostgREST
// parameterizes it safely, because a malformed/guessed id that happens to
// match a real user would let a crafted webhook call mutate that user's
// purchase state once the shared secret is known.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAnonymousAppUserId(id: string): boolean {
  return id.startsWith("$RCAnonymousID:");
}

export function isValidAppUserId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

// RevenueCat timestamps are milliseconds since epoch. Reject anything that
// isn't a finite, sane-range number rather than feeding an attacker-chosen
// value straight into `new Date(...)`, which would otherwise throw on
// `.toISOString()` for out-of-range values (uncaught exception → 500 with
// potential stack leak) or silently accept a nonsense far-future/negative
// date.
const MIN_MS = 0; // 1970-01-01
const MAX_MS = 4102444800000; // 2100-01-01

export function parseTimestampMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < MIN_MS || value > MAX_MS) return null;
  return value;
}

// Minimal shape check on the whole event before any field is read — rejects
// anything that isn't a plain object with a string `type`.
export function isValidEventShape(event: unknown): event is { type: string; app_user_id?: unknown; expiration_at_ms?: unknown; purchased_at_ms?: unknown; event_timestamp_ms?: unknown } {
  return (
    typeof event === "object" &&
    event !== null &&
    !Array.isArray(event) &&
    typeof (event as { type?: unknown }).type === "string"
  );
}
