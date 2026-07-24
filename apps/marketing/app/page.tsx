import Header from "./components/Header";
import Footer from "./components/Footer";
import { site } from "./site";

const FEATURES = [
  {
    title: "Commands & quirks",
    body: "The words they know, what they mean, and what earns the reward. The stuff that makes them them — not a form.",
  },
  {
    title: "Emergency contacts, protected",
    body: "Vet, insurance, backup contacts — there when it matters, with a PIN on the sensitive stuff.",
  },
  {
    title: "Routine, when you need it shown",
    body: "Feeding, walks, sleep, medications — as detailed as the situation calls for.",
  },
  {
    title: "Always current",
    body: "Update the profile, the link updates too. No new PDF to re-send.",
  },
  {
    title: "If they ever go missing",
    body: "Generate a print-ready poster and a social tile in one tap. Free, always. Here if you ever need it.",
  },
  {
    title: "You control the link",
    body: "Revoke access anytime. See when it was last viewed. Nothing lingers longer than you want it to.",
  },
];

const FAQS = [
  {
    q: "Do they need the app to see my pet's profile?",
    a: "No. They open a link in their browser. Nothing to download, nothing to sign up for.",
  },
  {
    q: "Is my pet's information safe?",
    a: "Emergency contacts and insurance details sit behind a PIN you set. You control every link — see when it was last viewed, revoke it anytime.",
  },
  {
    q: "What happens if I revoke a link?",
    a: "It stops working immediately. It won't un-show anything someone already saw, but no one can open it again.",
  },
  {
    q: "Does this work for cats? Rabbits? Anything that isn't a dog?",
    a: "Yes. Commands, routines, and quirks work for any pet — the words might just be different.",
  },
  {
    q: "What's actually free?",
    a: "Identity, commands, quirks, emergency contacts, feeding, and allergies. Always. Routines beyond feeding, medications, and unlimited pets are a one-time $7.99.",
  },
  {
    q: "Can I use this for more than one pet?",
    a: "One pet is free. Unlock unlimited pets for $7.99, once.",
  },
  {
    q: "What's the missing poster thing?",
    a: "One tap generates a print-ready poster and a social tile from your pet's existing profile. Free, always. Here if you ever need it.",
  },
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
              <p className="eyebrow text-primary">A pet profile that travels with them</p>
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
                  Download free
                </a>
                <a
                  href="#how"
                  className="rounded-button border border-border bg-card-bg px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
                >
                  See how it works ↓
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <StoreBadge kind="apple" href={site.appStoreUrl} />
                <StoreBadge kind="google" href={site.playStoreUrl} />
              </div>
            </div>

            {/* Cheat-sheet mock */}
            <div className="mx-auto w-full max-w-sm">
              <CheatSheetMock />
            </div>
          </div>
        </section>

        {/* Section 1 — The problem */}
        <section className="border-y border-border/70 bg-secondary/50">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
            <h2 className="font-tanker text-2xl leading-tight text-foreground sm:text-3xl">
              The old way was a text at 11pm.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-text-muted">
              &ldquo;What time does she eat?&rdquo; &ldquo;Is he allowed on the couch?&rdquo;
              &ldquo;What&apos;s the vet&apos;s number again?&rdquo;
            </p>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              A printed page goes out of date the moment you update it. A group chat gets buried.
              Quirks &amp; All is one link, always current, with everything a sitter, walker, or family
              member actually needs.
            </p>
          </div>
        </section>

        {/* Section 2 — Features */}
        <section id="how" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="eyebrow text-primary">What&apos;s inside</p>
          <h2 className="mt-3 max-w-xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
            Everything they need. Nothing you have to repeat.
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-card border border-border bg-card-bg p-6">
                <h3 className="text-base font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3 — Who it's for */}
        <section className="border-t border-border/70 bg-secondary/40">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
            <h2 className="font-tanker text-2xl leading-tight text-foreground sm:text-3xl">
              For whoever&apos;s holding the lead.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-text-muted">
              A weekend sitter. A regular dog walker. A boarding stay. Your mum, who means well but forgets
              the vacuum thing. One profile works for all of them — you decide what each link shows.
            </p>
          </div>
        </section>

        {/* Section 4 — Pricing */}
        <section id="pricing" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="eyebrow text-primary">Pricing</p>
          <h2 className="mt-3 max-w-2xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
            Free to start. {site.proPrice} to unlock the rest.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-text-muted">
            Identity, emergency contacts, commands, quirks, feeding, and allergies — free, always. Unlock
            routines, medications, and unlimited pets for a one-time {site.proPrice}. No subscription.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-card border border-border bg-card-bg p-8">
              <h3 className="text-lg font-bold text-foreground">Free</h3>
              <p className="mt-1 text-sm text-text-muted">Everything you need to hand off one pet.</p>
              <p className="mt-6 font-tanker text-4xl text-foreground">$0</p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-text-muted">
                <Check>Identity &amp; shareable profile link</Check>
                <Check>Commands, quirks &amp; triggers</Check>
                <Check>Feeding &amp; allergies, always shown</Check>
                <Check>PIN-gated emergency contacts</Check>
                <Check>Print-ready missing poster &amp; social tile</Check>
              </ul>
              <a
                href={site.appStoreUrl}
                className="mt-8 rounded-button border border-border bg-background px-5 py-3 text-center text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                Download free
              </a>
            </div>

            {/* Unlock */}
            <div className="flex flex-col rounded-card border border-transparent bg-card-dark p-8 text-card-dark-text">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Unlock the rest</h3>
                <span className="eyebrow rounded-full bg-card-dark-deep px-2.5 py-1 text-card-dark-label">
                  One-time
                </span>
              </div>
              <p className="mt-1 text-sm text-card-dark-label">One payment, all your pets, forever.</p>
              <p className="mt-6 font-tanker text-4xl">{site.proPrice}</p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-card-dark-text/90">
                <Check light>Routines — walks, sleep, bathroom, more</Check>
                <Check light>Medications &amp; conditions</Check>
                <Check light>Unlimited pets</Check>
                <Check light>Everything in Free, always included</Check>
              </ul>
              <a
                href={site.appStoreUrl}
                className="mt-8 rounded-button bg-background px-5 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Unlock for {site.proPrice}
              </a>
              <p className="mt-4 text-center text-xs text-card-dark-label">
                No subscription. Purchased in-app, unlocks account-wide.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 — FAQ */}
        <section id="faq" className="border-t border-border/70 bg-secondary/40">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <p className="eyebrow text-primary">FAQ</p>
            <h2 className="mt-3 font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
              Questions, answered plainly.
            </h2>

            <div className="mt-10 flex flex-col gap-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-card border border-border bg-card-bg px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-bold text-foreground">
                    {f.q}
                    <span
                      className="shrink-0 text-primary transition-transform duration-200 group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6 — Final CTA */}
        <section className="border-t border-border/70">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <h2 className="font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
              Away, but known.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              Download Quirks &amp; All and fill in your pet&apos;s profile in under five minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={site.appStoreUrl}
                className="rounded-button bg-button px-5 py-3 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
              >
                Download free
              </a>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <StoreBadge kind="apple" href={site.appStoreUrl} />
              <StoreBadge kind="google" href={site.playStoreUrl} />
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

/* App store badges. Placeholder store links until the real listings are live. */
function StoreBadge({ kind, href }: { kind: "apple" | "google"; href: string }) {
  const isApple = kind === "apple";
  return (
    <a
      href={href}
      aria-label={isApple ? "Download on the App Store" : "Get it on Google Play"}
      className="flex items-center gap-2.5 rounded-button bg-button px-4 py-2.5 text-card-dark-text transition-colors hover:bg-button-pressed"
    >
      <span aria-hidden className="shrink-0">
        {isApple ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 12.53c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.78-3.29 1.99-1.4 2.44-.36 6.04 1 8.02.67.97 1.47 2.06 2.51 2.02 1.01-.04 1.39-.65 2.61-.65 1.22 0 1.56.65 2.63.63 1.09-.02 1.78-.99 2.44-1.96.77-1.12 1.09-2.21 1.11-2.27-.02-.01-2.13-.82-2.15-3.23zM15.03 6.5c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.37 1.21-.52.6-.97 1.56-.85 2.48.9.07 1.83-.46 2.39-1.13z" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.6 2.4c-.24.25-.38.63-.38 1.13v16.94c0 .5.14.88.39 1.12l.06.06L13.1 12v-.22L3.66 2.34l-.06.06zM16.24 15.14L13.1 12v-.22l3.14-3.14.07.04 3.72 2.11c1.06.6 1.06 1.59 0 2.2l-3.72 2.11-.07.04zM15.9 15.5L12.68 12.3 3.6 21.4c.35.37.93.42 1.58.05l10.72-6.09M15.9 8.5L5.18 2.4C4.53 2.06 3.95 2.1 3.6 2.48l9.08 9.08L15.9 8.5z" />
          </svg>
        )}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-card-dark-label">
          {isApple ? "Download on the" : "Get it on"}
        </span>
        <span className="text-sm font-semibold">{isApple ? "App Store" : "Google Play"}</span>
      </span>
    </a>
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
