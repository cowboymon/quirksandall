import Link from "next/link";
import { site } from "../site";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-tanker text-xl leading-none text-foreground">
          {site.name}
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          <Link href="/#how" className="text-sm text-text-muted transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/#pricing" className="text-sm text-text-muted transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/#faq" className="text-sm text-text-muted transition-colors hover:text-foreground">
            FAQ
          </Link>
        </nav>

        <a
          href={site.appStoreUrl}
          className="rounded-button bg-button px-4 py-2 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
        >
          Download free
        </a>
      </div>
    </header>
  );
}
