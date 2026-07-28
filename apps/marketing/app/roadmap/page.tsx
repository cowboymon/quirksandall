import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { site } from "../site";

export const metadata: Metadata = {
  title: "Roadmap",
  description: `What ${site.name} is building next.`,
};

// Placeholder items — edit these to the real roadmap. Tone drives the status dot.
const COLUMNS: {
  status: string;
  tone: "building" | "next" | "exploring";
  items: { title: string; desc: string }[];
}[] = [
  {
    status: "Building now",
    tone: "building",
    items: [
      {
        title: "Sitter check-ins",
        desc: "Let whoever's watching tick off the walk, the feed, the meds — so you can see it's done.",
      },
      {
        title: "Reminders & nudges",
        desc: "Gentle prompts for medications and feeding times, on their phone.",
      },
    ],
  },
  {
    status: "Next up",
    tone: "next",
    items: [
      {
        title: "A link per kind of stay",
        desc: "A quick-sit link and a full-boarding link — each showing just what that person needs.",
      },
      {
        title: "Poster as a print-ready PDF",
        desc: "Download the missing poster as a PDF with a scannable QR code.",
      },
      {
        title: "Gift & redemption codes",
        desc: "Unlock the paid features with a code — handy for gifting, or for rescues.",
      },
    ],
  },
  {
    status: "Exploring",
    tone: "exploring",
    items: [
      {
        title: "A note back from the sitter",
        desc: "“She was a bit off her food today” — straight to you.",
      },
      {
        title: "Pet insurance, if you want it",
        desc: "Optional, opt-in offers from partners. Never your data without asking.",
      },
      {
        title: "Presets for every species",
        desc: "Cats, rabbits, birds — the right words for each, out of the box.",
      },
    ],
  },
];

const DOT: Record<string, string> = {
  building: "#467049", // green — in progress
  next: "#B83A52", // rose — planned
  exploring: "#987080", // muted — ideas
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
            {site.name} is just getting started. Here&apos;s what we&apos;re building now, what&apos;s next,
            and what we&apos;re still chewing over. Don&apos;t read the absence of something as a no — tell
            us what would help and it might jump the queue.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-16 sm:pb-24">
          <div className="grid gap-8 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.status}>
                <div className="flex items-center gap-2.5 border-b border-border pb-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DOT[col.tone] }}
                    aria-hidden
                  />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                    {col.status}
                  </h2>
                </div>
                <ul className="mt-5 flex flex-col gap-4">
                  {col.items.map((item) => (
                    <li
                      key={item.title}
                      className="rounded-card border border-border bg-card-bg p-5"
                    >
                      <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{item.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Feedback nudge */}
        <section className="border-t border-border/70 bg-[#E5BEC4]">
          <div className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-16">
            <h2 className="font-tanker text-2xl leading-tight text-foreground sm:text-3xl">
              Want a say in what&apos;s next?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-lg leading-relaxed text-foreground">
              Join the waitlist — when we email you at launch, just reply and tell us what would make{" "}
              {site.name} better for your pet.
            </p>
            <div className="mt-6">
              <a
                href="/#get"
                className="inline-block rounded-button bg-button px-5 py-3 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
              >
                Get notified at launch
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
