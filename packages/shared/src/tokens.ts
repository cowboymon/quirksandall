// Design tokens — consumed by both apps/web (as CSS vars / Tailwind config)
// and apps/mobile (as NativeWind theme extension / RN StyleSheet constants)

export const colors = {
  primary: "#4A2E3D",       // deep plum — buttons, CTAs, nav
  accent: "#D9A24A",        // honey ochre — highlights, commands table
  background: "#FBF4E8",    // warm cream — never pure white
  textDark: "#4A2E3D",
  textMuted: "#8A7A72",
  border: "#E8DCC8",
  success: "#7A9E6A",
  caution: "#C9A24A",       // not started
  danger: "#C98F8F",        // revoke
  dashedBorder: "#C9B896",  // add/skip affordances
  // Link card (dark surface)
  cardDark: "#4A2E3D",
  cardDarkText: "#F7E9C9",
  cardDarkLabel: "#D9A24A",
  // Neutral surfaces
  cardBg: "#FFFFFF",
  inputBg: "#F7F2EA",
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
  headlineFont: "Spectral_700Bold_Italic",
  labelSize: 11,
  labelTracking: 0.5,
} as const;

export const buttonHeight = 44;
