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

// Pricing — the one-time unlock, shown on the marketing site and as the
// mobile fallback.
//
// The mobile app does NOT render this directly: usePrice() reads the store's
// own localized priceString (RevenueCat → App Store / Play) so each user sees
// their real charge in their own currency, and a price change in App Store
// Connect needs no app update. This constant is what usePrice() falls back to
// while loading or when the store is unreachable, and it's what the marketing
// site (which has no store connection) displays.
//
// The base price is set in the AU storefront, so this string is AUD. Keep it in
// sync with that, not with the US price.
//
// TODO — revisit both together when the pricing model lands (annual + lifetime
// is under discussion, and the one-time price is expected to rise from launch):
//   1. This value.
//   2. The currency marker. The marketing site renders PRICE verbatim
//      (apps/marketing/app/page.tsx:84, 311, 354, and a derived number at 139)
//      with no currency shown, so a non-AU reader takes A$7.99 for US$7.99 —
//      roughly a 50% understatement. Either write it "A$7.99" here or qualify
//      it at those call sites. Real buyers are unaffected: usePrice() shows
//      StoreKit's own localized priceString, and this constant is only the
//      offline fallback.
export const PRICE = "$7.99";

// Stamped onto every consent record (owners.consent_policy_version + each
// consent_log row) so we can prove which privacy-policy version a user agreed
// to. PLACEHOLDER until legal finalises the policy — bump this string when the
// real policy is published, and every subsequent consent write records the new
// version. Existing rows keep the version that was current when they were made.
export const CONSENT_POLICY_VERSION = "draft-2026-07";
