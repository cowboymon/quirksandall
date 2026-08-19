import Link from "next/link";
import { site } from "../site";

// py-2 gives each link a ~36px tap height (was ~20px) — comfortable on touch,
// especially for the Privacy/Terms links a reviewer needs to hit on a phone.
const linkClass = "inline-block py-2 text-text-muted transition-colors hover:text-foreground";
const Sep = () => (
  <span aria-hidden className="text-border">
    ·
  </span>
);

export default function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Logo left, nav pulled up into the same row (fills the space beside
            the logo). Left cluster = discretionary reading; the obligation
            links sit at the far right so a reviewer finds the privacy URL. */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <img src="/brand/logo-footer.png" alt={site.name} className="h-16 w-auto" />
            <p className="mt-2 text-sm text-text-muted">{site.tagline}</p>
            <div className="mt-3 -ml-2 flex items-center gap-1">
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${site.name} on Instagram`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:text-foreground"
              >
                <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                  <path
                    d="M176,32H80A48,48,0,0,0,32,80v96a48,48,0,0,0,48,48h96a48,48,0,0,0,48-48V80A48,48,0,0,0,176,32ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"
                    opacity="0.2"
                  />
                  <path d="M176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24Zm40,152a40,40,0,0,1-40,40H80a40,40,0,0,1-40-40V80A40,40,0,0,1,80,40h96a40,40,0,0,1,40,40ZM128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm64-84a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z" />
                </svg>
              </a>
              <a
                href={site.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${site.name} on TikTok`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:text-foreground"
              >
                <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                  <path
                    d="M224,120a95.55,95.55,0,0,1-56-18v54a68,68,0,0,1-136,0c0-33.46,24.17-62.33,56-68v42.69A28,28,0,1,0,128,156V24h40a56,56,0,0,0,56,56Z"
                    opacity="0.2"
                  />
                  <path d="M224,72a48.05,48.05,0,0,1-48-48,8,8,0,0,0-8-8H128a8,8,0,0,0-8,8V156a20,20,0,1,1-28.57-18.08A8,8,0,0,0,96,130.69V88a8,8,0,0,0-9.4-7.88C50.91,86.48,24,119.1,24,156a76,76,0,0,0,152,0V116.29A103.25,103.25,0,0,0,224,128a8,8,0,0,0,8-8V80A8,8,0,0,0,224,72Zm-8,39.64a87.19,87.19,0,0,1-43.33-16.15A8,8,0,0,0,160,102v54a60,60,0,0,1-120,0c0-25.9,16.64-49.13,40-57.6v27.67A36,36,0,1,0,136,156V32h24.5A64.14,64.14,0,0,0,216,87.5Z" />
                </svg>
              </a>
            </div>
          </div>

          <nav className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-x-8">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Link href="/about" className={linkClass}>
                About
              </Link>
              <Sep />
              <Link href="/blog" className={linkClass}>
                Blog
              </Link>
              <Sep />
              <Link href="/roadmap" className={linkClass}>
                Roadmap
              </Link>
              <Sep />
              <Link href="/support" className={linkClass}>
                Support
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              <Sep />
              <Link href="/terms" className={linkClass}>
                Terms of Service
              </Link>
            </div>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-1.5 border-t border-border/50 pt-6">
          <p className="text-sm text-text-muted">
            {site.name} is made by{" "}
            <a
              href={site.makerUrl}
              className="text-text-muted underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {site.maker}
            </a>
            , the team behind {site.makerOtherProduct}.
          </p>
          <p className="eyebrow text-text-muted">
            © {new Date().getFullYear()} {site.operator}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
