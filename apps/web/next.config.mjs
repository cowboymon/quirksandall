// Security headers, applied to every response by Next.js's own header-merging
// layer regardless of whether it came from middleware, an API route, or a
// page — so this is the one place to set them, not each route individually.
//
// script-src/style-src need 'unsafe-inline' because this app has no
// per-request nonce plumbing (Next.js's own inline hydration/bootstrap
// scripts, and this app's inline style={{}} usage, both need it) — a nonce
// -based CSP would be stricter but is a bigger, riskier change than a
// hardening pass should make. default-src 'self' + the explicit allowlists
// below still block arbitrary third-party script/resource injection, which
// is the actual goal here.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
  "font-src 'self' data: https://api.fontshare.com",
  "img-src 'self' data: https://images.unsplash.com https://*.supabase.co",
  // Supabase (DB/storage) + Mixpanel (apps/web/app/lib/analytics.ts, EU ingestion host).
  "connect-src 'self' https://*.supabase.co https://api-eu.mixpanel.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@quirksandall/shared"],
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "bktxnovrkiilkfvzlwwo.supabase.co" },
    ],
  },
  // Drop the "X-Powered-By: Next.js" fingerprinting header.
  poweredByHeader: false,
  // Explicit, not just relying on the (also-false) default: never ship
  // source maps to the browser in production.
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Belt-and-suspenders alongside frame-ancestors above, for older
          // browsers that don't support the CSP directive.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Vercel terminates TLS and redirects http->https already; this
          // tells browsers to skip the plaintext hop entirely on repeat
          // visits. No "preload" — that's a separate, effectively
          // irreversible submission this hardening pass shouldn't make
          // unilaterally.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
