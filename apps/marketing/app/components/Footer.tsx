import Link from "next/link";
import { site } from "../site";

const linkClass = "text-text-muted transition-colors hover:text-foreground";
const Sep = () => (
  <span aria-hidden className="text-border">
    ·
  </span>
);

export default function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div>
          <img src="/brand/logo-footer.png" alt={site.name} className="h-16 w-auto" />
          <p className="mt-2 text-sm text-text-muted">{site.tagline}</p>
        </div>

        {/* Left cluster = discretionary reading; right = the obligation links
            (a reviewer checking the privacy URL finds it without scanning). */}
        <nav className="mt-8 flex flex-col gap-3 border-t border-border/50 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
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

        <div className="mt-8 flex flex-col gap-1.5">
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
