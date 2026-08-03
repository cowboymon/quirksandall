// Pure, framework-free input-validation helpers — no Next.js/Node-runtime
// imports, so these can be unit tested directly and reused anywhere a
// request body needs strict validation before it touches a template, a
// header, or a file path.

// Caps + strips control characters from a free-text field. Returns null if
// the input isn't a string, is empty after trimming, or exceeds maxLen —
// callers decide whether null means "reject" or "use a default".
export function sanitizeFreeText(input: unknown, maxLen: number): string | null {
  if (typeof input !== "string") return null;
  // Strip C0/C1 control characters (including CR/LF) — free text here only
  // ever needs to render as a single line of poster copy, never multiline
  // markup, and stripping control chars also closes off any header/log
  // injection if a caller later reuses this value somewhere line-oriented.
  // eslint-disable-next-line no-control-regex
  const stripped = input.replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!stripped) return null;
  if (stripped.length > maxLen) return null;
  return stripped;
}

// A raw data: URI is attacker-supplied and must be format- and size-bounded
// BEFORE it's handed to any decoder — this only validates shape, callers
// still need to decode through sharp to normalize/re-encode the actual
// image bytes (a well-formed data URI can still contain a hostile payload
// inside a valid image container).
const DATA_URI_RE = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/]+=*)$/;
// ~10MB of base64 text decodes to ~7.5MB of image bytes — plenty for a
// phone photo, small enough to bound memory/CPU in the sharp/satori pipeline.
const MAX_DATA_URI_LENGTH = 10 * 1024 * 1024;

export function isValidImageDataUri(input: unknown): input is string {
  if (typeof input !== "string") return false;
  if (input.length > MAX_DATA_URI_LENGTH) return false;
  return DATA_URI_RE.test(input);
}

// Strips characters that would let a value break out of a quoted
// Content-Disposition filename parameter (quotes, backslash, CR/LF, other
// control characters) — a DB value like a pet name must never be
// interpolated into an HTTP header verbatim. Falls back to a safe default
// if nothing printable survives.
export function sanitizeHeaderFilenameComponent(input: string, fallback = "file"): string {
  // eslint-disable-next-line no-control-regex
  const stripped = input.replace(/[\x00-\x1F\x7F"\\]/g, "").trim();
  return stripped || fallback;
}
