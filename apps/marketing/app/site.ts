// Central place for the handful of values the marketing site references.
// Update these when the real store listings / contact address are live.
import { PRICING } from "@quirksandall/shared";

// ── Launch switch ───────────────────────────────────────────────────────────
// Paste a real store URL when that platform's listing goes live; "#" means
// "coming soon" for that platform. Availability is derived PER-PLATFORM, so we
// can launch on one store before the other — Apple is expected to go live
// first, Google later. Flipping these two URLs is the whole go-live change:
// the store badges, the "Get Notified → Download" CTAs, and the review store
// links all react to them. No other edit required.
const APP_STORE_URL: string = "#";
const PLAY_STORE_URL: string = "#";
const APP_STORE_LIVE = APP_STORE_URL !== "#" && APP_STORE_URL.length > 1;
const PLAY_STORE_LIVE = PLAY_STORE_URL !== "#" && PLAY_STORE_URL.length > 1;
const LAUNCHED = APP_STORE_LIVE || PLAY_STORE_LIVE;

export const site = {
  name: "Quirks & All",
  tagline: "Away, but known.",
  description:
    "Fill in your pet's profile once. Share a link with whoever's looking after them. No app needed on their end — just everything they need to know.",
  // Canonical production URL. Drives metadataBase, canonicals, the sitemap and
  // absolute OG image links. Set NEXT_PUBLIC_SITE_URL in the deployment to
  // override without a code change; the fallback is the expected live domain.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://quirksandall.itshypothetical.com").replace(
    /\/$/,
    "",
  ),
  appStoreUrl: APP_STORE_URL,
  playStoreUrl: PLAY_STORE_URL,
  // Per-platform availability, derived from whether a real URL is set above.
  appStoreLive: APP_STORE_LIVE,
  playStoreLive: PLAY_STORE_LIVE,
  // True once at least one store is live — flips the CTAs from waitlist to store.
  launched: LAUNCHED,
  // Where the primary CTA points: the App Store if it's live, else Google Play
  // if it's live, else the homepage waitlist section (pre-launch).
  ctaHref: APP_STORE_LIVE ? APP_STORE_URL : PLAY_STORE_LIVE ? PLAY_STORE_URL : "/#get",
  // CTA label: "Get Notified" pre-launch, "Download" once a store is live.
  ctaLabel: LAUNCHED ? "Download" : "Get Notified",
  // Contact used in the legal pages and the footer.
  contactEmail: "quirksandall@itshypothetical.com",
  // Social profiles (handle: quirksandall.app on both).
  instagramUrl: "https://instagram.com/quirksandall.app",
  tiktokUrl: "https://www.tiktok.com/@quirksandall.app",
  // Company / operator name shown in legal copy.
  operator: "Quirks & All",
  // The registered contracting party named in the Terms and Privacy Policy.
  // Sole trader (ABN 22 525 634 531), styled as "name trading as brand".
  // A lawyer should confirm the exact registered-name form (ABN Lookup lists
  // it as "Rattanong, Monica Litheda") before final publication.
  legalEntity: "Monica Rattanong trading as Its Hypothetical",
  // The individual behind the sole-trader ABN, used where we want the person
  // named separately from the "trading as" brand.
  legalPerson: "Monica Rattanong",
  legalAbn: "22 525 634 531",
  // Maker attribution shown in the footer.
  maker: "Its Hypothetical",
  makerUrl: "https://itshypothetical.com",
  makerOtherProduct: "Loud & Fine",
  // Keep in sync when you revise the legal pages.
  legalLastUpdated: "28 July 2026",
  // Single source of truth for prices lives in @quirksandall/shared —
  // PRICING.lifetime (one-time) and PRICING.annual (auto-renewing yearly).
  pricing: PRICING,
} as const;
