// Pure helpers for validating/sanitizing user- or DB-controlled values before
// they're placed in an href/src — an <a>/<img> whose target isn't scheme
// -restricted is a redirect/XSS-adjacent risk (a javascript:, data:, or
// vbscript: URL executing when clicked/loaded). Every value here is
// "trust nothing until it's an exact match for what's expected," not
// "assume it's fine because nothing has gone wrong yet."

// Only http(s) — never javascript:, data:, vbscript:, file:, or any other
// scheme. Use for any <a href> or <img src> built even partly from
// user/DB-controlled text.
export function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

// A tel: href is built by string-concatenating a DB phone value after a
// fixed "tel:" prefix — the prefix itself can never be overridden by that
// value, but the value could still smuggle something odd through
// (whitespace tricks, stray characters). Rebuilds the value from an
// allowlist of characters a phone number can legitimately contain, rather
// than just checking for absence of "bad" ones — returns null (render
// nothing / no link) if nothing safe survives.
const TEL_ALLOWED_RE = /[^0-9+\-() ]/g;

export function sanitizeTelValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(TEL_ALLOWED_RE, "").trim();
  // Require at least a few digits — "+" or "()" alone isn't a phone number,
  // and this also rejects an empty/near-empty result.
  const digitCount = (cleaned.match(/\d/g) ?? []).length;
  if (digitCount < 3) return null;
  return cleaned;
}
