export type Review = {
  quote: string;
  name: string;
  detail?: string; // role / location, e.g. "Beta tester, Sydney"
  stars?: number; // 1–5, defaults to 5
};

// ── GATE ────────────────────────────────────────────────────────────────────
// Keep this FALSE until every quote below is a REAL, permissioned testimonial —
// a named beta user who agreed to be quoted, or a genuine App Store / Google
// Play review. Publishing fabricated reviews as if they were real is misleading
// conduct under the Australian Consumer Law and breaks Apple's and Google's
// policies. The section renders nothing while this is false, so no placeholder
// ever reaches a live visitor. Flip to true only when the content is real.
export const REVIEWS_LIVE = true;

// Aggregate rating shown above the quotes. Set a figure ONLY when it's real
// (your beta-tester average, or the live App Store / Play average later) — same
// honesty rule as the quotes themselves. Leave null to show the stars +
// label with no number, which is the safe default.
export const REVIEWS_RATING: string | null = null;
export const REVIEWS_RATING_LABEL = "from our beta testers";

// Real, permissioned beta-tester quotes. Keep every entry a genuine testimonial
// — never put invented words under a real name (see the gate note above). The
// displayed names are pseudonyms to protect the testers' identities; the words,
// ratings and cities are theirs.
export const REVIEWS: Review[] = [
  {
    quote:
      "The last time we went away, we forgot to tell our sitter where the cat carrier was — so when the fire alarm went off and they had to evacuate, they couldn't grab him. Luckily it turned out to be a false alarm, but my heart was in my mouth.",
    name: "Steph L.",
    detail: "Beta tester, Canberra",
    stars: 5,
  },
  {
    quote: "Honestly it's so good!!",
    name: "Meg C.",
    detail: "Beta tester, Brisbane",
    stars: 4.5,
  },
  {
    quote:
      "I'm an anxious person, so leaving Kiki with my mum while we're away had me a bit scared — she hasn't lived with Kiki for two years, since I moved out. But being able to put down exactly what Kiki does and when, and where all her things are, means I can rest a little easier.",
    name: "Nadia R.",
    detail: "Beta tester, Sydney",
    stars: 5,
  },
];
