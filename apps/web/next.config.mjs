// Security headers, applied to every response by Next.js's own header-merging
// layer regardless of whether it came from middleware, an API route, or a
// page — so this is the one place to set them, not each route individually.
//
// script-src/style-src need 'unsafe-inline'. Verified empirically, not just
// assumed: removing it from script-src and loading real pages in a headless
// browser throws "Refused to execute inline script" against Next.js's own
// hydration/RSC-payload scripts on every page — this app has no per-request
// nonce plumbing (which Next.js does support, but wiring it up needs
// middleware generating a nonce and forwarding it through headers() to
// every page — a bigger, separately-worth-doing change, not a drop-in for
// this pass). This CSP is defense-in-depth on top of the actual XSS
// defense, which is React's JSX auto-escaping — there is no
// dangerouslySetInnerHTML/innerHTML/DOM-write sink anywhere in this app
// (audited, see the XSS hardening pass) for 'unsafe-inline' to matter
// against today. default-src 'self' + the explicit allowlists below still
// block loading an external attacker-hosted script and constrain
// exfiltration channels (connect-src/img-src), which is real value even
// with 'unsafe-inline' present.
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
