import type { Metadata } from "next";
import Header from "./components/Header";
import Footer from "./components/Footer";
import WaitlistForm from "./components/WaitlistForm";
import { Underline, CircleMark, MarginArrow } from "./components/Annotations";
import { site } from "./site";
import TrackedLink from "./components/TrackedLink";

// Homepage-specific metadata. Names both dogs and cats explicitly (the default
// description is species-neutral) so the page surfaces for cat-sitter searches
// too, not just generic pet ones.
export const metadata: Metadata = {
  description:
    "Fill in your pet's profile once — dog or cat — and share a link with whoever's looking after them. Feeding, litter, medications, walks and the quirks only you know, all in one link. No app needed on their end.",
  keywords: [
    "cat sitter instructions",
    "what to leave for a cat sitter",
    "cat care sheet",
    "dog sitter info",
    "pet sitting instructions",
    "pet care profile",
    "share pet info with a sitter",
  ],
};

const FEATURES = [
  {
    // Underline only the key word, matching the app's selective emphasis.
    mark: "Commands",
    title: "Commands, and how solid they are",
    body: "The word, what it means, what earns the reward — and whether it's still learning, solid, or mastered. A stand-in knows what to actually expect when they say it.",
  },
  {
    title: "Emergency contacts, behind a PIN",
    body: "Vet, emergency vet, insurance, backups. Sensitive details sit behind a 4-digit PIN you set. It remembers a trusted device for 30 days, so nobody's re-typing it mid-stay.",
  },
  {
    title: "A link that can't go stale",
    body: "Edit in the app, the link updates instantly. Name it, see when it's been opened, revoke it whenever.",
  },
  {
    mark: "how long",
    title: "Know how long they're staying",
    body: "Set a duration per link. The stand-in sees it up top: “Biscuit's with you until Sat 3 Aug.”",
  },
  {
    title: "If they ever go missing",
    body: "Generate a printable, shareable poster straight from the profile. Free, always. Here if you ever need it.",
  },
  {
    mark: "Certificates",
    title: "Certificates, kept somewhere findable",
    body: "Vaccination and flea/worm records, stored so they're not a scramble the night before a boarding stay.",
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
    a: "Absolutely — plenty of Quirks & All profiles are for cats. Feeding routine, litter, medications, whether they're indoor-only or bolt for the door, and the exact spot they hide when someone new is over. “Commands” just become house rules; everything else is the same.",
  },
  {
    q: "What should I leave for a cat sitter?",
    a: "The things a cat sitter actually needs: feeding times and which food, where the litter is and how often to scoop, any medications and how to give them, your vet and an emergency contact, whether the cat is indoor-only, and where they hide so nobody panics. Quirks & All keeps all of it on one link — with no app for the sitter to install.",
  },
  {
    q: "What's actually free?",
    a: "ID, commands, allergies, medications and conditions, escape risk, emergency contacts, feeding times, and one shareable link. Permanently. Medical information is never paywalled.",
  },
  {
    q: "Can I use this for more than one pet?",
    a: `One pet is free. Unlock unlimited pets for ${site.proPrice}, once.`,
  },
  {
    q: "Can I give different stand-ins different links?",
    a: "One link is free. The unlock lets you run several at once — one for your walker, one for the kennel — each revocable on its own.",
  },
  {
    q: "What's the missing poster thing?",
    a: "One tap generates a printable, shareable poster straight from your pet's existing profile. Free, always. Here if you ever need it.",
  },
];

// Real app screenshots. Add the three files to /public/shots with these exact
// names; an empty src renders a labelled placeholder frame until they exist.
const SHOTS = [
  {
    src: "/shots/onboarding.png",
    caption: "Set it up in minutes",
    alt: "Quirks & All onboarding screen for introducing your dog's profile",
  },
  {
    src: "/shots/share.png",
    caption: "What a stand-in opens",
    alt: "The shared pet care cheat-sheet a stand-in opens in their browser, no app needed",
  },
  {
    src: "/shots/poster.png",
    caption: "If they ever go missing",
    alt: "A printable missing-pet poster generated from the pet's profile",
  },
];

// Three-step "how it works" — plain, extractable sentences (good for AI answer
// engines) and a quick orientation for first-time visitors.
const STEPS = [
  {
    n: "1",
    title: "Fill it in once",
    body: "Add your pet's profile — commands, medications and doses, feeding times, and the quirks only you know. A few minutes, one time.",
  },
  {
    n: "2",
    title: "Share a link",
    body: "Send whoever's looking after them a single link. They open it in any browser — nothing to download, no account to make.",
  },
  {
    n: "3",
    title: "It stays current",
    body: "Change anything in the app and the link updates instantly. See when it was opened, and revoke it the moment the stay is over.",
  },
];

// Homepage structured data. SoftwareApplication tells search + AI engines what
// the product is, what it runs on, and what it costs; FAQPage marks up the Q&A
// so it's eligible for rich results and easy for LLMs to quote verbatim.
const priceNum = site.proPrice.replace(/[^0-9.]/g, "");
const homeLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${site.url}/#app`,
      name: site.name,
      description: site.description,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "iOS, Android",
      url: site.url,
      keywords:
        "cat sitter instructions, cat care sheet, dog sitter info, pet sitting instructions, pet care profile for a sitter",
      publisher: { "@id": `${site.url}/#org` },
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "AUD",
          description:
            "Pet ID, commands, allergies, medications and doses, emergency contacts, feeding times and one shareable link — free forever. Medical information is never paywalled.",
        },
        {
          "@type": "Offer",
          name: "Unlock the rest",
          price: priceNum,
          priceCurrency: "AUD",
          description:
            "One-time purchase: unlimited pets, a separate live link per stand-in, and the full daily routine.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${site.url}/#faq`,
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeLd).replace(/</g, "\\u003c") }}
      />
      <Header />

      <main className="flex-1">
        {/* 1 — Hero (page default #F8ECEE) — text only, centred */}
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
          <p className="eyebrow text-primary">For anyone who leaves their pet with someone else</p>
          <h1 className="mx-auto mt-4 font-tanker text-5xl leading-[1.03] text-foreground sm:text-7xl">
            You know your pet by heart. Everyone else is{" "}
            <span className="relative inline-block text-primary">
              guessing.
              <Underline className="absolute -bottom-1.5 left-0 h-3 w-full text-primary sm:-bottom-2 sm:h-4" />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
            The rushed note on the counter. The three follow-up texts from the airport. The thing you forgot
            to mention that only comes up at 9pm. Quirks &amp; All puts everything a stand-in needs in one
            link they can actually open.
          </p>
          <div className="mt-8 flex justify-center">
            <TrackedLink
              href="/#get"
              event="Get Notified Clicked"
              meta={{ location: "mid" }}
              className="inline-block rounded-button bg-button px-5 py-3 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
            >
              Get notified
            </TrackedLink>
          </div>
        </section>

        {/* 1b — How it works (#F8ECEE — same as What's inside) */}
        <section>
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <p className="eyebrow text-primary">How it works</p>
            <h2 className="mt-3 max-w-xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
              Three steps, then you can actually leave.
            </h2>
            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground font-tanker text-lg text-card-dark-text">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 2 — Features (#F8ECEE) */}
        <section id="how" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="eyebrow text-primary">What&apos;s inside</p>
          <h2 className="mt-3 max-w-xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
            Write them down before someone else has to guess.
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-card border border-border bg-card-bg p-6">
                <h3 className="text-base font-bold text-foreground">
                  <MarkedHeading title={f.title} mark={f.mark} />
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2b — A look inside (#E5BEC4 surface, phone screenshots) */}
        <section className="bg-[#E5BEC4]">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
            <p className="eyebrow text-primary">A look inside</p>
            <h2 className="mt-3 max-w-xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
              Fill it in fast. They read it faster.
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {SHOTS.map((s) => (
                <PhoneShot key={s.caption} src={s.src} caption={s.caption} alt={s.alt} />
              ))}
            </div>
          </div>
        </section>

        {/* 3 — Medications statement (#510000 full bleed) */}
        <section className="bg-card-dark text-card-dark-text">
          <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
            <MarginArrow className="absolute left-2 top-24 hidden h-10 w-16 text-card-dark-label lg:block" />
            <p className="mx-auto max-w-2xl font-tanker text-4xl leading-[1.12] sm:text-5xl">
              We don&apos;t put a paywall between a pet and their medicine.
            </p>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-card-dark-text/85">
              Allergies, medications, doses and emergency contacts are free on every profile. Always. Not a
              launch offer — a rule.
            </p>
          </div>
        </section>

        {/* 4 — Who it's for (#E5BEC4; muted grey fails AA here, so body copy is #510000) */}
        <section className="bg-[#E5BEC4]">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
            <h2 className="font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
              For whoever&apos;s got them.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-foreground">
              A weekend stand-in. A dog walker. The neighbour who pops in to feed the cat. A boarding stay or
              cattery. Your mum, who means well but forgets the vacuum thing. One profile works for all of them
              — a link each, revoked whenever you like.
            </p>
          </div>
        </section>

        {/* 5 — Pricing (#F8ECEE) */}
        <section id="pricing" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="eyebrow text-primary">Pricing</p>
          <h2 className="mt-3 max-w-2xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
            Free to start.{" "}
            <span className="relative inline-block">
              <span className="relative z-10">{site.proPrice}</span>
              <CircleMark className="absolute left-1/2 top-1/2 h-[1.6em] w-[128%] -translate-x-1/2 -translate-y-1/2 text-primary" />
            </span>{" "}
            to unlock the rest.
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-card border border-border bg-card-bg p-8">
              <h3 className="text-lg font-bold text-foreground">Free, always</h3>
              <p className="mt-1 text-sm text-text-muted">Everything you need to hand off one pet.</p>
              <p className="mt-6 font-tanker text-4xl text-foreground">$0</p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-text-muted">
                <Check>Pet ID — photo, breed, age, microchip &amp; more</Check>
                <Check>Commands, with how solid each one is</Check>
                <Check>Allergies, medications &amp; doses</Check>
                <Check>Escape / flight-risk flag</Check>
                <Check>PIN-gated emergency contacts</Check>
                <Check>Feeding times &amp; one live link</Check>
                <Check>Missing poster &amp; document vault</Check>
              </ul>
              <TrackedLink
                href="/#get"
                event="Get Notified Clicked"
                meta={{ location: "pricing-free" }}
                className="mt-8 rounded-button border border-border bg-background px-5 py-3 text-center text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                Get notified at launch
              </TrackedLink>
              <p className="mt-4 min-h-[2.5rem] text-center text-xs text-text-muted">
                Free forever. No card, no subscription.
              </p>
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
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm text-card-dark-text/90">
                <Check light>Full daily routine — walks, sleep, bathroom</Check>
                <Check light>The soft stuff — fears, no-go zones, temperament</Check>
                <Check light>A separate live link per stand-in</Check>
                <Check light>Unlimited pets</Check>
                <Check light>Everything in Free, always included</Check>
              </ul>
              <TrackedLink
                href="/#get"
                event="Get Notified Clicked"
                meta={{ location: "pricing-pro" }}
                className="mt-8 rounded-button bg-background px-5 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Get notified at launch
              </TrackedLink>
              <p className="mt-4 min-h-[2.5rem] text-center text-xs text-card-dark-label">
                No subscription. Purchased in-app, unlocks account-wide.
              </p>
            </div>
          </div>
        </section>

        {/* 6 — FAQ (#F8ECEE) */}
        <section id="faq" className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
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
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <span className="text-base font-bold text-foreground">{f.q}</span>
                  {/* Chevron matching the app's nav — rotates on expand */}
                  <svg
                    aria-hidden
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 shrink-0 text-primary transition-transform duration-200 group-open:rotate-180"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 7 — Final CTA (#510000 full bleed) */}
        <section id="get" className="scroll-mt-20 bg-card-dark text-card-dark-text">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/cta-dog.svg"
              alt=""
              aria-hidden
              className="mx-auto mb-5 h-24 w-24 sm:h-28 sm:w-28"
            />
            <h2 className="font-tanker text-4xl leading-tight sm:text-5xl">Away, but known.</h2>

            <div className="mt-6 flex justify-center">
              <WaitlistForm
                source="footer"
                tone="dark"
                intro="We're putting the finishing touches on it. Leave your email and we'll tell you the moment it's live."
              />
            </div>

            <div className="mt-10 flex flex-nowrap items-center justify-center gap-3">
              <StoreBadge kind="apple" href={site.appStoreUrl} onDark />
              <StoreBadge kind="google" href={site.playStoreUrl} onDark />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* Renders a heading with the squiggle underline on one key word only —
   selective emphasis, matching the app, not a full-line decoration. */
function MarkedHeading({ title, mark }: { title: string; mark?: string }) {
  const i = mark ? title.indexOf(mark) : -1;
  if (!mark || i < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, i)}
      <span className="relative inline-block">
        {mark}
        <Underline className="absolute -bottom-1 left-0 h-2.5 w-full text-primary/70" />
      </span>
      {title.slice(i + mark.length)}
    </>
  );
}

/* Phone mockup for the "A look inside" section. Empty src → placeholder frame. */
function PhoneShot({ src, caption, alt }: { src?: string; caption: string; alt?: string }) {
  return (
    <figure className="flex flex-col items-center">
      <div className="w-full max-w-[220px] rounded-[2rem] border-[3px] border-card-dark bg-card-dark p-0.5 shadow-xl shadow-primary/20">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.8rem] bg-card-bg">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt ?? caption} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="eyebrow text-text-muted">Screenshot</span>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-4 text-center text-sm font-medium text-foreground">{caption}</figcaption>
    </figure>
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

/* App store badges. Pre-launch, these show a non-clickable "Coming soon"
   state (site.comingSoon); flip the flag and set the URLs to go live.
   `onDark` recolours the pill for the maroon sections so it stays legible. */
function StoreBadge({
  kind,
  href,
  onDark,
}: {
  kind: "apple" | "google";
  href: string;
  onDark?: boolean;
}) {
  const isApple = kind === "apple";
  const soon = site.comingSoon;
  const icon = (
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
  );
  const inner = (
    <>
      {icon}
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] uppercase tracking-wide text-card-dark-label">
          {soon ? "Coming soon to" : isApple ? "Download on the" : "Get it on"}
        </span>
        <span className="text-sm font-semibold">{isApple ? "App Store" : "Google Play"}</span>
      </span>
    </>
  );

  if (soon) {
    return (
      <span
        aria-label={`${isApple ? "App Store" : "Google Play"} — coming soon`}
        className={`flex cursor-default items-center gap-2.5 rounded-button px-4 py-2.5 text-card-dark-text ${
          onDark ? "border border-card-dark-label/60 bg-card-dark-deep" : "bg-button/70"
        }`}
      >
        {inner}
      </span>
    );
  }
  return (
    <TrackedLink
      href={href}
      aria-label={isApple ? "Download on the App Store" : "Get it on Google Play"}
      event="App Download Clicked"
      meta={{ platform: isApple ? "iOS" : "Android" }}
      className="flex items-center gap-2.5 rounded-button bg-button px-4 py-2.5 text-card-dark-text transition-colors hover:bg-button-pressed"
    >
      {inner}
    </TrackedLink>
  );
}
