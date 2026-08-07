// Security headers, applied to every response by Next.js's own header-merging
// layer regardless of whether it came from middleware.ts's admin gate, an
// API route, or a page — so this is the one place to set them, not each
// route individually. See apps/web/next.config.mjs for the same pattern and
// the reasoning behind 'unsafe-inline' — verified empirically (removing it
// breaks Next.js's own hydration scripts) rather than assumed, and this app
// has no dangerouslySetInnerHTML/innerHTML/DOM-write sink for it to matter
// against today (the two dangerouslySetInnerHTML uses in this app are
// static JSON-LD, not user data — see the XSS hardening pass).
const CSP = [
  "default-src 'self'",
  // Pirsch analytics script (app/layout.tsx) — loaded from and beacons to
  // api.pirsch.io.
  "script-src 'self' 'unsafe-inline' https://api.pirsch.io",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self' https://api.pirsch.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@quirksandall/shared"],
  // Bundle the Markdown content with the routes that read it at runtime
  // (the ISR llms.txt route; blog posts served on-demand). Static pages read
  // it at build, but tracing these guarantees the files are always present.
  outputFileTracingIncludes: {
    "/llms.txt": ["./content/**/*"],
    "/blog/[slug]": ["./content/blog/**/*"],
    "/sitemap.xml": ["./content/blog/**/*"],
    "/privacy": ["./content/privacy.md"],
    "/terms": ["./content/terms.md"],
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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
