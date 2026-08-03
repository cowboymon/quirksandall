import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedAdmin } from "./app/lib/adminAuth";
import { checkRateLimit, clientIp } from "./app/lib/rateLimit";

// HTTP Basic Auth gate for /admin. The browser shows a native login prompt;
// credentials are checked against env vars. Set ADMIN_PASSWORD (and optionally
// ADMIN_USER, default "admin") in the deployment. Served over HTTPS on Vercel,
// so the header is encrypted in transit.

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Quirks & All admin", charset="UTF-8"' },
  });
}

export async function middleware(req: NextRequest) {
  // Fail closed: if no password is configured, nobody gets in.
  if (!process.env.ADMIN_PASSWORD) {
    return new NextResponse("Admin is not configured (set ADMIN_PASSWORD).", { status: 503 });
  }

  // Durable, cross-instance brute-force throttle on the admin login itself —
  // this is the most sensitive credential in the app, so it gets the
  // strictest limit: 10 attempts per 15 minutes per IP, checked BEFORE the
  // password compare so a lockout can't be raced by hammering in parallel.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key);
    const allowed = await checkRateLimit(supabase, "admin_login", clientIp(req), 10, 15 * 60);
    if (!allowed) {
      return new NextResponse("Too many attempts. Try again later.", { status: 429 });
    }
  }

  if (isAuthorizedAdmin(req)) {
    return NextResponse.next();
  }
  return unauthorized();
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"] };
