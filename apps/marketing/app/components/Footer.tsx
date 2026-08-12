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
