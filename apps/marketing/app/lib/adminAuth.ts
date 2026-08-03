// Shared admin credential check, used by both middleware.ts (the primary
// gate) and individually inside each /api/admin/* route handler as
// defense-in-depth — so a matcher typo, a route added outside the matcher,
// or a middleware config change doesn't silently strip protection from an
// admin endpoint. Keeping this in one place means both call sites always
// agree on what "authenticated as admin" means.

// Constant-time-ish string compare to avoid leaking the password via timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Accepts anything with a Headers-like get() — a Request/NextRequest, or the
// readonly Headers from next/headers() in a Server Component.
type HeaderSource = { get(name: string): string | null };

// Returns true only if the request carries valid admin Basic Auth
// credentials AND ADMIN_PASSWORD is configured (fails closed otherwise).
export function isAuthorizedAdmin(reqOrHeaders: HeaderSource | Request): boolean {
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass) return false;
  const expectedUser = process.env.ADMIN_USER || "admin";

  // ReadonlyHeaders (next/headers) and a bare Headers expose get() directly;
  // a Request/NextRequest carries it on .headers. Detect a callable get()
  // rather than sniffing a "headers" property — ReadonlyHeaders also exposes
  // a (non-callable) .headers, which the old check wrongly unwrapped into,
  // throwing "h.get is not a function" and 500ing the admin page.
  const h: HeaderSource =
    typeof (reqOrHeaders as HeaderSource).get === "function"
      ? (reqOrHeaders as HeaderSource)
      : (reqOrHeaders as Request).headers;
  const header = h.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;

  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  const user = i >= 0 ? decoded.slice(0, i) : "";
  const pass = i >= 0 ? decoded.slice(i + 1) : "";
  return safeEqual(user, expectedUser) && safeEqual(pass, expectedPass);
}

export function unauthorizedResponse(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Quirks & All admin", charset="UTF-8"' },
  });
}
