import { site } from "../site";
import TrackedLink from "./TrackedLink";
import { REVIEWS, REVIEWS_LIVE } from "../reviews-data";

// Social proof. Renders nothing until REVIEWS_LIVE is true AND there are
// reviews — so fabricated placeholder content never reaches a live visitor
// (see reviews-data.ts). Once the store listings are live (site.comingSoon
// false), a row of "more reviews on the store" links appears beneath.
function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5 text-primary" role="img" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < n ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.98l-5.8 3.05 1.1-6.47L2.6 9.45l6.5-.95L12 2.6z" />
        </svg>
      ))}
    </div>
  );
}

export default function Reviews() {
  if (!REVIEWS_LIVE || REVIEWS.length === 0) return null;

  const storeLive = !site.comingSoon;

  return (
    <section id="reviews" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <h2 className="max-w-xl font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
        What people are saying.
      </h2>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {REVIEWS.map((r, i) => (
          <li
            key={`${r.name}-${i}`}
            className="flex flex-col rounded-card border border-border bg-card-bg p-6"
          >
            <Stars n={r.stars ?? 5} />
            <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground">“{r.quote}”</p>
            <p className="mt-4 text-sm font-bold text-foreground">{r.name}</p>
            {r.detail ? <p className="text-xs text-text-muted">{r.detail}</p> : null}
          </li>
        ))}
      </ul>

      {storeLive && (
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <TrackedLink
            href={site.appStoreUrl}
            event="Reviews Store Link Clicked"
            meta={{ platform: "iOS" }}
            className="font-medium text-primary hover:underline"
          >
            More reviews on the App Store →
          </TrackedLink>
          <TrackedLink
            href={site.playStoreUrl}
            event="Reviews Store Link Clicked"
            meta={{ platform: "Android" }}
            className="font-medium text-primary hover:underline"
          >
            More reviews on Google Play →
          </TrackedLink>
        </div>
      )}
    </section>
  );
}
