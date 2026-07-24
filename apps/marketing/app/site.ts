// Central place for the handful of values the marketing site references.
// Update these when the real store listings / contact address are live.
export const site = {
  name: "Quirks & All",
  tagline: "Away, but known.",
  description:
    "Fill in your pet's profile once. Share a link with whoever's looking after them. No app needed on their end — just everything they need to know.",
  // Placeholder store links — swap for the real listings when published.
  appStoreUrl: "#",
  playStoreUrl: "#",
  // Contact used in the legal pages. Change to your real support inbox.
  contactEmail: "support@quirksandall.app",
  // Company / operator name shown in legal copy.
  operator: "Quirks & All",
  // Maker attribution shown in the footer.
  maker: "Its Hypothetical",
  makerOtherProduct: "Loud & Fine",
  // Keep in sync when you revise the legal pages.
  legalLastUpdated: "22 July 2026",
  proPrice: "$7.99",
} as const;
