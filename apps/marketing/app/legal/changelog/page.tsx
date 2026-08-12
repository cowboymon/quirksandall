import type { Metadata } from "next";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export const metadata: Metadata = {
  title: "Legal change history",
  description: "A plain-English record of what's changed in our Privacy Policy and Terms of Service between versions.",
  alternates: { canonical: "/legal/changelog" },
};

// One entry per published version of each legal document. Add a new row (newest
// first) whenever Privacy or Terms materially changes and its version is bumped —
// keep the summary short and plain-English, this is the record both docs link to.
type ChangelogEntry = {
  date: string; // display date, matches the doc's "Last updated"
  document: "Privacy Policy" | "Terms of Service";
  href: string;
  version: string;
  summary: string;
};

const ENTRIES: ChangelogEntry[] = [
  {
    date: "12 August 2026",
    document: "Privacy Policy",
    href: "/privacy",
    version: "1.1",
    summary:
      "Added Sentry (crash and error reporting for the mobile app) to our service providers, and clarified that opening a shared link is counted anonymously through our analytics provider, which stores a small identifier on your device.",
  },
  {
    date: "4 August 2026",
    document: "Privacy Policy",
    href: "/privacy",
    version: "1.0",
    summary: "First published version.",
  },
  {
    date: "28 July 2026",
    document: "Terms of Service",
    href: "/terms",
    version: "1.0",
    summary: "First published version.",
  },
];

export default function LegalChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <p className="eyebrow text-primary">Legal</p>
        <h1 className="mt-3 font-tanker text-4xl leading-none text-foreground sm:text-5xl">
          Change history
        </h1>
        <p className="mt-4 max-w-prose text-text-muted">
          A record of what&apos;s changed in our{" "}
          <Link href="/privacy" className="text-primary underline underline-offset-2 hover:no-underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-primary underline underline-offset-2 hover:no-underline">
            Terms of Service
          </Link>{" "}
          between versions.
        </p>

        <ul className="mt-10 flex flex-col gap-6">
          {ENTRIES.map((entry) => (
            <li
              key={`${entry.document}-${entry.version}`}
              className="border-l-2 border-border pl-5"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  href={entry.href}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {entry.document}
                </Link>
                <span className="text-sm font-medium text-primary">Version {entry.version}</span>
                <span className="eyebrow text-text-muted">{entry.date}</span>
              </div>
              <p className="mt-1.5 text-text-muted">{entry.summary}</p>
            </li>
          ))}
        </ul>
      </main>

      <Footer />
    </div>
  );
}
