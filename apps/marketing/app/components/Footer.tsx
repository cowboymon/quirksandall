import Link from "next/link";
import { site } from "../site";
import TrackedLink from "./TrackedLink";

const linkClass = "text-text-muted transition-colors hover:text-foreground";

export default function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12 sm:flex-row sm:justify-between">
        <div>
          <img src="/brand/logo-footer.png" alt={site.name} className="h-16 w-auto" />
          <p className="mt-2 text-sm text-text-muted">{site.tagline}</p>
        </div>

        <nav className="grid grid-cols-2 gap-x-12 gap-y-8 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2.5">
            <p className="eyebrow text-foreground">Explore</p>
            <Link href="/roadmap" className={linkClass}>
              Roadmap
            </Link>
            <Link href="/blog" className={linkClass}>
              Blog
            </Link>
            <Link href="/about" className={linkClass}>
              About
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="eyebrow text-foreground">Legal</p>
            <Link href="/privacy" className={linkClass}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={linkClass}>
              Terms of Service
            </Link>
            <Link href="/legal/changelog" className={linkClass}>
              Change history
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="eyebrow text-foreground">Help</p>
            <Link href="/support" className={linkClass}>
              Support
            </Link>
            <TrackedLink
              href={`mailto:${site.contactEmail}`}
              event="Contact Clicked"
              meta={{ location: "footer" }}
              className={linkClass}
            >
              Contact
            </TrackedLink>
          </div>
        </nav>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-1.5 border-t border-border/70 px-6 py-8">
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
