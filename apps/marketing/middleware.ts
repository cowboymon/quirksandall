import { NextRequest, NextResponse } from "next/server";

// HTTP Basic Auth gate for /admin. The browser shows a native login prompt;
// credentials are checked against env vars. Set ADMIN_PASSWORD (and optionally
// ADMIN_USER, default "admin") in the deployment. Served over HTTPS on Vercel,
// so the header is encrypted in transit.

// Constant-time-ish string compare to avoid leaking the password via timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Quirks & All admin", charset="UTF-8"' },
  });
}

export function middleware(req: NextRequest) {
  const expectedPass = process.env.ADMIN_PASSWORD;
  const expectedUser = process.env.ADMIN_USER || "admin";

  // Fail closed: if no password is configured, nobody gets in.
  if (!expectedPass) {
    return new NextResponse("Admin is not configured (set ADMIN_PASSWORD).", { status: 503 });
  }

  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try {
      decoded = atob(encoded);
    } catch {
      return unauthorized();
    }
    const i = decoded.indexOf(":");
    const user = i >= 0 ? decoded.slice(0, i) : "";
    const pass = i >= 0 ? decoded.slice(i + 1) : "";
    if (safeEqual(user, expectedUser) && safeEqual(pass, expectedPass)) {
      return NextResponse.next();
    }
  }
  return unauthorized();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
