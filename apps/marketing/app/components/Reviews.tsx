import { site } from "../site";
import TrackedLink from "./TrackedLink";
import {
  REVIEWS,
  REVIEWS_LIVE,
  REVIEWS_RATING,
  REVIEWS_RATING_LABEL,
} from "../reviews-data";

// Social proof. Renders nothing until REVIEWS_LIVE is true AND there are
// reviews, so fabricated placeholder content never reaches a live visitor
// (see reviews-data.ts). Featured-lead layout: the first review runs large in
// the display face with a left accent bar; the rest sit beside it. Per-review
// stars use a softer tone so they don't compete with the bold aggregate stars.
// Once the store listings are live (site.comingSoon false), a "more reviews on
// the store" link row appears beneath.
function Stars({ size = 16, tone = "text-primary" }: { size?: number; tone?: string }) {
  return (
    <div className={`flex gap-0.5 ${tone}`} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.98l-5.8 3.05 1.1-6.47L2.6 9.45l6.5-.95L12 2.6z" />
        </svg>
      ))}
    </div>
  );
}

// Bold, full-strength — the section's rating anchor.
function Aggregate() {
  return (
    <div className="flex items-center gap-3">
      {REVIEWS_RATING ? (
        <span className="font-tanker text-4xl leading-none text-foreground">{REVIEWS_RATING}</span>
      ) : null}
      <span className="flex flex-col gap-1">
        <Stars size={15} />
        <span className="text-xs text-text-muted">{REVIEWS_RATING_LABEL}</span>
      </span>
    </div>
  );
}

// Softer than the aggregate, so review stars read as present-but-secondary.
const REVIEW_STARS = "text-primary/40";

export default function Reviews() {
  if (!REVIEWS_LIVE || REVIEWS.length === 0) return null;

  const [lead, ...rest] = REVIEWS;

  return (
    <section id="reviews" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-tanker text-3xl leading-tight text-foreground sm:text-4xl">
          What people are saying.
        </h2>
        <Aggregate />
      </div>

      <div className="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-2">
        {/* Featured lead — the only quote with the accent bar */}
        <figure className="flex flex-col border-l-2 border-primary pl-6">
          <Stars size={18} tone={REVIEW_STARS} />
          <blockquote className="mt-4 font-tanker text-2xl leading-snug text-foreground sm:text-[1.75rem]">
            {lead.quote}
          </blockquote>
          <figcaption className="mt-5 text-sm font-bold text-foreground">
            {lead.name}
            {lead.detail ? <span className="ml-2 font-normal text-text-muted">{lead.detail}</span> : null}
          </figcaption>
        </figure>

        {/* Supporting reviews — no bar */}
        {rest.length > 0 && (
          <div className="flex flex-col gap-8 self-center">
            {rest.map((r) => (
              <div key={r.name} className="flex flex-col">
                <Stars tone={REVIEW_STARS} />
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-foreground">{r.quote}</p>
                <p className="mt-3 text-sm font-bold text-foreground">
                  {r.name}
                  {r.detail ? <span className="ml-2 font-normal text-text-muted">{r.detail}</span> : null}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {!site.comingSoon && (
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
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
