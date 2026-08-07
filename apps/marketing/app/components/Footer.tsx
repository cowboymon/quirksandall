import Link from "next/link";
import { site } from "../site";

export default function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <img src="/brand/logo-footer.png" alt={site.name} className="h-16 w-auto" />
          <p className="mt-2 text-sm text-text-muted">{site.tagline}</p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link href="/roadmap" className="text-text-muted transition-colors hover:text-foreground">
            Roadmap
          </Link>
          <Link href="/blog" className="text-text-muted transition-colors hover:text-foreground">
            Blog
          </Link>
          <Link href="/about" className="text-text-muted transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/privacy" className="text-text-muted transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-text-muted transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/support" className="text-text-muted transition-colors hover:text-foreground">
            Support
          </Link>
        </nav>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-1.5 px-6 pb-10">
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
    </footer>
  );
}
