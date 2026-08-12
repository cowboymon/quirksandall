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
export const REVIEWS_LIVE = false;

// Aggregate rating shown above the quotes. Set a figure ONLY when it's real
// (your beta-tester average, or the live App Store / Play average later) — same
// honesty rule as the quotes themselves. Leave null to show the stars +
// label with no number, which is the safe default.
export const REVIEWS_RATING: string | null = null;
export const REVIEWS_RATING_LABEL = "from our beta testers";

// SAMPLE placeholder content — for laying out and previewing the design only.
// REPLACE every entry (quote, name and detail) with real, permissioned words
// before setting REVIEWS_LIVE = true. The attributions deliberately say
// "Placeholder" so that, if the gate is ever flipped before the content is
// swapped, it's obvious rather than deceptive.
export const REVIEWS: Review[] = [
  {
    quote:
      "I used to leave a two-page note and still get texts at the airport. Now it's one link and my sitter has everything — feeding, meds, the works.",
    name: "Sample name",
    detail: "Placeholder — replace before launch",
    stars: 5,
  },
  {
    quote:
      "The emergency-contacts-behind-a-PIN thing sold me. My walker can see the routine but not my vet details unless she needs them.",
    name: "Sample name",
    detail: "Placeholder — replace before launch",
    stars: 5,
  },
  {
    quote:
      "Set it up once, share it with whoever's minding the cat. They didn't have to download anything, which is the whole reason it actually got used.",
    name: "Sample name",
    detail: "Placeholder — replace before launch",
    stars: 5,
  },
];
