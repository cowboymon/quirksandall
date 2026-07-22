import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { site } from "./site";

const STEPS = [
  {
    n: "01",
    title: "Write down their quirks",
    body: "Name, breed, the command words that actually work, what scares them, allergies, meds, vet — all in a few taps.",
  },
  {
    n: "02",
    title: "Share one link",
    body: "The sitter, dog-walker or neighbour opens a link. No app, no login. Emergency contacts stay behind a PIN.",
  },
  {
    n: "03",
    title: "They just know",
    body: "They see the same picture of your pet you'd give them in person — without you hovering over the group chat.",
  },
];

const FEATURES = [
  {
    title: "The cheat sheet",
    body: "A clean, mobile-first page of everything that matters. Quick view for the essentials, full view for the whole day.",
  },
  {
    title: "Command words that work",
    body: "“Sit” means nothing if the dog only knows “park it.” List the words, what they mean and the reward.",
  },
  {
    title: "Quirks & triggers",
    body: "Scared of the hoover, bolts at open doors, off the sofa — the stuff that turns a good sitter into a great one.",
  },
  {
    title: "PIN-gated emergencies",
    body: "Vet, after-hours clinic, insurance and backup contacts sit behind a PIN, so a link is never a leak.",
  },
  {
    title: "A printable poster",
    body: "Generate a fridge-door poster with the QR code and the basics, for whoever's in the house.",
  },
  {
    title: "Always current",
    body: "Change something in the app and every link updates. The sitter always sees today's version, not last summer's.",
  },
];

const PRO = [
  "Routine visible to sitters — feeding, walks, sleep, bathroom",
  "Medications & conditions, with where they're stored",
  "Add as many pets as you need",
  "Rotate the share link — old one stops working instantly",
  "Push nudges for trick reinforcement",
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-primary">For anyone who leaves their pet with someone else</p>
              <h1 className="mt-4 font-tanker text-4xl leading-[1.05] text-foreground sm:text-6xl">
                Away,<br />but known.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-text-muted">
                {site.description}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={site.appStoreUrl}
                  className="rounded-button bg-button px-5 py-3 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
                >
                  Download for iOS
                </a>
                <a
                  href={site.playStoreUrl}
                  className="rounded-button border border-border bg-card-bg px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
                >
                  Get it on Android
                </a>
              </div>
              <p className="mt-4 text-sm text-text-muted">
                Free to start · one-time {site.proPrice} unlock, no subscription
              </p>
            </div>

            {/* Cheat-sheet mock */}
            <div className="mx-auto w-full max-w-sm">
              <CheatSheetMock />
            </div>
          </div>
        </section>

        {/* Problem / promise */}
        <section className="border-y border-border/70 bg-secondary/50">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
            <h2 className="font-tanker text-2xl leading-tight text-foreground sm:text-3xl">
              You know your pet by heart. The sitter is guessing.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              The rushed note on the counter. The three follow-up texts from the airport. The thing you
              forgot to mention that only comes up at 9pm. Quirks &amp; All puts everything a carer needs
              in one link they can actually open — so being away doesn&apos;t mean being out of the loop.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="eyebrow text-primary">How it works</p>
          <h2 className="mt-3 max-w-xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
            Three steps, then you can stop worrying.
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-card border border-border bg-card-bg p-6">
                <span className="font-tanker text-2xl text-primary">{s.n}</span>
                <h3 className="mt-3 text-lg font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border/70 bg-secondary/40">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <p className="eyebrow text-primary">What&apos;s inside</p>
            <h2 className="mt-3 max-w-xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
              Everything they&apos;d ask you — before they have to.
            </h2>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-card border border-border bg-card-bg p-6">
                  <h3 className="text-base font-bold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="eyebrow text-primary">Pricing</p>
          <h2 className="mt-3 max-w-xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
            Free where it counts. One payment for the rest.
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-card border border-border bg-card-bg p-8">
              <h3 className="text-lg font-bold text-foreground">Free</h3>
              <p className="mt-1 text-sm text-text-muted">Everything you need to hand off one pet.</p>
              <p className="mt-6 font-tanker text-4xl text-foreground">£0</p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-text-muted">
                <Check>Shareable cheat-sheet link</Check>
                <Check>Quirks, triggers &amp; command words</Check>
                <Check>Allergies, always shown</Check>
                <Check>PIN-gated emergency contacts</Check>
                <Check>Printable QR poster</Check>
              </ul>
              <a
                href={site.appStoreUrl}
                className="mt-8 rounded-button border border-border bg-background px-5 py-3 text-center text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                Start free
              </a>
            </div>

            {/* Pro */}
            <div className="flex flex-col rounded-card border border-transparent bg-card-dark p-8 text-card-dark-text">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Pro</h3>
                <span className="eyebrow rounded-full bg-card-dark-deep px-2.5 py-1 text-card-dark-label">
                  One-time
                </span>
              </div>
              <p className="mt-1 text-sm text-card-dark-label">One payment, all your pets, forever.</p>
              <p className="mt-6 font-tanker text-4xl">{site.proPrice}</p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-card-dark-text/90">
                {PRO.map((item) => (
                  <Check key={item} light>
                    {item}
                  </Check>
                ))}
              </ul>
              <a
                href={site.appStoreUrl}
                className="mt-8 rounded-button bg-background px-5 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Unlock Pro
              </a>
              <p className="mt-4 text-center text-xs text-card-dark-label">
                No subscription. Purchased in-app, unlocks account-wide.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/70">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <h2 className="font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
              Write them down before someone else has to guess.
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={site.appStoreUrl}
                className="rounded-button bg-button px-5 py-3 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
              >
                Download for iOS
              </a>
              <a
                href={site.playStoreUrl}
                className="rounded-button border border-border bg-card-bg px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                Get it on Android
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Check({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={light ? "text-card-dark-label" : "text-success"} aria-hidden>
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

/* A small, faithful mock of the recipient "cheat sheet" the app generates. */
function CheatSheetMock() {
  return (
    <div className="rotate-1 rounded-card border border-border bg-card-bg p-5 shadow-xl shadow-primary/10">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-secondary text-2xl">
          🐕
        </div>
        <div>
          <p className="font-tanker text-2xl leading-none text-foreground">Biscuit&apos;s Cheat Sheet</p>
          <p className="mt-1 text-xs text-text-muted">Golden Retriever mix · 4 yrs</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1 rounded-card p-1" style={{ backgroundColor: "#EFE7D8" }}>
        <span
          className="flex-1 rounded-button py-1.5 text-center text-xs font-medium"
          style={{ backgroundColor: "#510000", color: "#F8ECEE" }}
        >
          Quick view
        </span>
        <span className="flex-1 py-1.5 text-center text-xs font-medium text-text-muted">Full view</span>
      </div>

      <div className="mt-4">
        <p className="eyebrow text-text-muted">Commands</p>
        <div className="mt-2 overflow-hidden rounded-card border border-border">
          <div className="flex text-[11px] font-medium uppercase tracking-wide" style={{ backgroundColor: "#510000", color: "#F8ECEE" }}>
            <span className="flex-1 px-2.5 py-1.5">Word</span>
            <span className="flex-1 px-2.5 py-1.5">Means</span>
          </div>
          <div className="flex border-t border-border bg-white text-xs">
            <span className="flex-1 px-2.5 py-1.5 font-semibold text-primary">Park it</span>
            <span className="flex-1 px-2.5 py-1.5 text-text-muted">Lie down</span>
          </div>
          <div className="flex border-t border-border text-xs" style={{ backgroundColor: "#F8ECEE" }}>
            <span className="flex-1 px-2.5 py-1.5 font-semibold text-primary">This way</span>
            <span className="flex-1 px-2.5 py-1.5 text-text-muted">Come back</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="eyebrow text-text-muted">Quirks &amp; triggers</p>
        <div className="mt-2 rounded-card border bg-white px-3 py-2" style={{ borderColor: "#A07848" }}>
          <p className="eyebrow" style={{ color: "#A07848" }}>Flight risk</p>
          <p className="mt-0.5 text-xs text-primary">Bolts at open doors. Lead on before the gate.</p>
        </div>
      </div>

      <div className="mt-4 rounded-card border border-border bg-secondary/60 px-3 py-2.5 text-center">
        <p className="eyebrow text-text-muted">🔒 Emergency contacts behind a PIN</p>
      </div>
    </div>
  );
}
