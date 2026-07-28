import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { site } from "../site";
import { SHIPPED } from "./data";
import RoadmapBoard from "./RoadmapBoard";
import SuggestForm from "./SuggestForm";

export const metadata: Metadata = {
  title: "Roadmap",
  description: `What ${site.name} has shipped, what it's building now, and what's next. Vote on ideas or suggest your own.`,
  alternates: { canonical: "/roadmap" },
  openGraph: {
    title: `Roadmap · ${site.name}`,
    description: `What ${site.name} has shipped, what it's building now, and what's next.`,
    url: `${site.url}/roadmap`,
    type: "website",
  },
};

export default function RoadmapPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-8 sm:pt-24">
          <p className="eyebrow text-primary">Roadmap</p>
          <h1 className="mt-3 max-w-2xl font-tanker text-4xl leading-[1.05] text-foreground sm:text-6xl">
            Where we&apos;re headed.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-muted">
            {site.name} is just getting started. Here&apos;s what we&apos;re building now,
            what&apos;s next, and what we&apos;re still chewing over. Don&apos;t read the absence of
            something as a no — give the ideas a thumb and the loudest ones jump the queue.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-6 pt-4 pb-16 sm:pb-20">
          <RoadmapBoard />
        </section>

        {/* Already shipped — factual, no voting. A quiet list, not cards. */}
        <section className="mx-auto max-w-5xl px-6 pb-16 sm:pb-24">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <span
              aria-hidden
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-card-bg"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Already shipped
            </h2>
          </div>
          <ul className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {SHIPPED.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span aria-hidden className="mt-1 shrink-0 text-success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <p className="text-sm leading-relaxed text-text-muted">
                  <span className="font-bold text-foreground">{item.title}</span>
                  {" — "}
                  {item.desc}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Feedback nudge — thumb the ideas above, or suggest your own. */}
        <section className="border-t border-border/70 bg-[#E5BEC4]">
          <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
            <SuggestForm />
            <p className="mt-6 text-center text-sm text-foreground/80">
              Rather just hear when we launch?{" "}
              <a href="/#get" className="font-medium text-primary underline underline-offset-2">
                Join the waitlist
              </a>
              .
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
