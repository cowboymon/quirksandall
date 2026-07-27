// Central place for the handful of values the marketing site references.
// Update these when the real store listings / contact address are live.
export const site = {
  name: "Quirks & All",
  tagline: "Away, but known.",
  description:
    "Fill in your pet's profile once. Share a link with whoever's looking after them. No app needed on their end — just everything they need to know.",
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
  // Maker attribution shown in the footer.
  maker: "Its Hypothetical",
  makerOtherProduct: "Loud & Fine",
  // Keep in sync when you revise the legal pages.
  legalLastUpdated: "27 July 2026",
  proPrice: "$7.99",
} as const;
