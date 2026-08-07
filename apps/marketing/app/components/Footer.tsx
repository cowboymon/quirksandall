import Link from "next/link";
import { site } from "../site";
import TrackedLink from "./TrackedLink";

const linkClass = "text-text-muted transition-colors hover:text-foreground";

export default function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4 md:gap-x-6 lg:gap-x-10">
          <div className="col-span-2 flex flex-col md:col-span-1">
            <img src="/brand/logo-footer.png" alt={site.name} className="h-14 w-auto" />
            <p className="mt-2 text-sm text-text-muted">{site.tagline}</p>

            <div className="mt-6 flex flex-col gap-1.5">
              <p className="text-sm text-text-muted">
                Made by{" "}
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
        </div>
      </div>
    </footer>
  );
}
