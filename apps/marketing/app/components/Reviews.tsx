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
// the display face; the rest sit beside it. Per-review stars use a softer tone
// so they don't compete with the bold aggregate stars. Once a store listing is
// live, a "more reviews on the store" link appears for each live platform.
const STAR_PATH =
  "M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.98l-5.8 3.05 1.1-6.47L2.6 9.45l6.5-.95L12 2.6z";

function StarShape({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="block" aria-hidden>
      <path d={STAR_PATH} />
    </svg>
  );
}

// Renders `count` out of 5 with half support (e.g. 4.5). Each position is a
// faded base star with a filled overlay clipped to its fill fraction — no
// gradient ids, so it's SSR-safe and inherits whatever `tone` colour is set.
function Stars({ count = 5, size = 16, tone = "text-primary" }: { count?: number; size?: number; tone?: string }) {
  return (
    <div className={`flex gap-0.5 ${tone}`} role="img" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, count - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <span className="block opacity-25">
              <StarShape size={size} />
            </span>
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <StarShape size={size} />
              </span>
            )}
          </span>
        );
      })}
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
        {/* Featured lead — large display-face quote */}
        <figure className="flex flex-col">
          <Stars count={lead.stars ?? 5} size={18} tone={REVIEW_STARS} />
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
                <Stars count={r.stars ?? 5} tone={REVIEW_STARS} />
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

      {(site.appStoreLive || site.playStoreLive) && (
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {site.appStoreLive && (
            <TrackedLink
              href={site.appStoreUrl}
              event="Reviews Store Link Clicked"
              meta={{ platform: "iOS" }}
              className="font-medium text-primary hover:underline"
            >
              More reviews on the App Store →
            </TrackedLink>
          )}
          {site.playStoreLive && (
            <TrackedLink
              href={site.playStoreUrl}
              event="Reviews Store Link Clicked"
              meta={{ platform: "Android" }}
              className="font-medium text-primary hover:underline"
            >
              More reviews on Google Play →
            </TrackedLink>
          )}
        </div>
      )}
    </section>
  );
}
