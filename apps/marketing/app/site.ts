// Central place for the handful of values the marketing site references.
// Update these when the real store listings / contact address are live.
import { PRICING } from "@quirksandall/shared";

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
  // Pre-launch: the apps aren't in the stores yet, so the download
  // affordances show "Coming soon" instead of linking out. Flip to false
  // and fill in the URLs below when the listings go live.
  comingSoon: true,
  appStoreUrl: "#",
  playStoreUrl: "#",
  // Contact used in the legal pages and the footer.
  contactEmail: "quirksandall@itshypothetical.com",
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
