import Link from "next/link";
import { site } from "../site";

export default function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-tanker text-lg leading-none text-foreground">{site.name}</p>
          <p className="mt-1.5 text-sm text-text-muted">{site.tagline}</p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link href="/#how" className="text-text-muted transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/#pricing" className="text-text-muted transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/privacy" className="text-text-muted transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-text-muted transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <a
            href={`mailto:${site.contactEmail}`}
            className="text-text-muted transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </nav>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-1.5 px-6 pb-10">
        <p className="text-sm text-text-muted">
          {site.name} is made by {site.maker}, the team behind {site.makerOtherProduct}.
        </p>
        <p className="eyebrow text-text-muted">
          © {new Date().getFullYear()} {site.operator}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
