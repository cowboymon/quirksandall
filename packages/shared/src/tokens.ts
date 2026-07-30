// Design tokens — consumed by both apps/web (as CSS vars / Tailwind config)
// and apps/mobile (as NativeWind theme extension / RN StyleSheet constants)
// Source of truth: Figma export src/styles/theme.css

export const colors = {
  primary: "#B83A52",       // rose — accents, active states, inline CTAs
  primaryForeground: "#F8ECEE",
  accent: "#B83A52",
  background: "#F8ECEE",    // warm blush — app background, never pure white
  foreground: "#510000",    // deep crimson — primary text
  textDark: "#510000",
  textMuted: "#74555D",     // deepened mauve — meets WCAG AA on blush + white
  secondary: "#F2E4E6",     // light blush — secondary surfaces
  border: "#E5BEC4",        // hairline borders
  success: "#467049",       // done green (AA)
  caution: "#7F5A30",       // amber — saved/caution state (AA)
  danger: "#9A5050",        // revoke, danger states (AA)
  dashedBorder: "#D8B0B8",  // add/skip affordances (borders only, not text)
  // Buttons — Figma primary button is deep crimson, hover #3E0000
  button: "#510000",
  buttonPressed: "#3E0000",
  buttonText: "#F8ECEE",
  // Dark surface (link card, dashboard header, poster bands)
  cardDark: "#510000",
  cardDarkDeep: "#3E0000",
  cardDarkText: "#F8ECEE",
  cardDarkLabel: "#F0A0B0",
  // Neutral surfaces
  cardBg: "#FFFBFB",
  inputBg: "#FFFBFB",
} as const;

export const radius = {
  card: 12,
  button: 10,
  input: 10,
} as const;

export const spacing = {
  screenH: 24, // horizontal screen padding
  gap: 16,
} as const;

export const typography = {
  // Tanker — display/headlines. Satoshi — body/UI.
  headlineFont: "Tanker",
  bodyFont: "Satoshi",
  bodyFontMedium: "Satoshi-Medium",
  bodyFontBold: "Satoshi-Bold",
  headlineTracking: -0.01, // em
  labelSize: 11,
  labelTracking: 0.5,
} as const;

export const buttonHeight = 44;

// Pricing — two plans: a one-time lifetime unlock and an auto-renewing
// annual subscription. Both open the same entitlement ("pro"); they differ
// only in how it's paid for and whether it can lapse.
//
// The mobile app does NOT render these directly: usePrices() reads the
// store's own localized priceString per package (RevenueCat → App Store /
// Play) so each user sees their real charge in their own currency, and a
// price change in App Store Connect needs no app update. These constants are
// what usePrices() falls back to while loading or when the store is
// unreachable, and what the marketing site (which has no store connection)
// displays.
//
// PROVISIONAL VALUES — the final numbers aren't locked yet. This object is
// the single place to edit when they are; everything else derives from it.
// Two rules when updating:
//   1. The base price is set in the AU storefront, so these strings are AUD
//      and carry the A$ marker (the marketing site renders them verbatim to
//      a worldwide audience — an unmarked "$" reads as USD and understates
//      the price by ~50%). Keep them in sync with App Store Connect's AU
//      figures, not the US ones.
//   2. Deploy the marketing site in the same breath as the App Store Connect
//      price change, so the site never advertises a price the store isn't
//      charging.
export const PRICING = {
  lifetime: "A$29.99",
  annual: "A$9.99",
} as const;

// Stamped onto every consent record (owners.consent_policy_version + each
// consent_log row) so we can prove which privacy-policy version a user agreed
// to. PLACEHOLDER until legal finalises the policy — bump this string when the
// real policy is published, and every subsequent consent write records the new
// version. Existing rows keep the version that was current when they were made.
export const CONSENT_POLICY_VERSION = "draft-2026-07";
