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

// Pricing — single source of truth for the one-time unlock, shown across the
// mobile paywall/account screens and the marketing site. Change PRICE here to
// run a price update everywhere at once (a future increase is one edit).
// NOTE: this is the *display* string only. The amount actually charged is set
// by the store product (RevenueCat → App Store / Play). When the price changes,
// update the store product price too so the two stay in sync.
export const PRICE = "$7.99";
