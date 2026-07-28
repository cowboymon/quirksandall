import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { site } from "../site";

export const metadata: Metadata = {
  title: "Support",
  description: `Get help with ${site.name} — contact our team.`,
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 pt-16 pb-24 sm:pt-24">
          <p className="eyebrow text-primary">Support</p>
          <h1 className="mt-3 font-tanker text-4xl leading-[1.05] text-foreground sm:text-5xl">
            Need a hand?
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-text-muted">
            We&apos;re a small team and we read every message. Whether something&apos;s not working,
            you have a question, or you just want to tell us about your pet — email us and we&apos;ll
            get back to you, usually within a couple of business days.
          </p>

          <div className="mt-8 rounded-card border border-border bg-card-bg p-6">
            <p className="text-sm font-medium text-text-muted">Email us</p>
            <a
              href={`mailto:${site.contactEmail}`}
              className="mt-1 block break-all font-tanker text-2xl text-primary underline underline-offset-4 sm:text-3xl"
            >
              {site.contactEmail}
            </a>
          </div>

          <div className="mt-10 border-t border-border/70 pt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Before you write
            </h2>
            <ul className="mt-4 flex flex-col gap-2 text-sm leading-relaxed text-text-muted">
              <li>
                Quick questions may already be answered in our{" "}
                <a
                  href="/#faq"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  FAQ
                </a>
                .
              </li>
              <li>
                Got a feature idea? Tell us on the{" "}
                <a
                  href="/roadmap#suggest"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  roadmap
                </a>
                .
              </li>
              <li>
                For account, data or privacy requests, see our{" "}
                <a
                  href="/privacy"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  Privacy Policy
                </a>
                .
              </li>
            </ul>
          </div>

          <p className="mt-10 text-sm text-text-muted">
            {site.name} is made by {site.maker}
            {site.legalEntity ? ` (${site.legalEntity}, ABN ${site.legalAbn})` : ""}.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
