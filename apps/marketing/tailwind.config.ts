import type { Config } from "tailwindcss";
import { colors, radius } from "@quirksandall/shared";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        background: colors.background,
        foreground: colors.foreground,
        secondary: colors.secondary,
        "text-dark": colors.textDark,
        "text-muted": colors.textMuted,
        border: colors.border,
        success: colors.success,
        caution: colors.caution,
        danger: colors.danger,
        button: colors.button,
        "button-pressed": colors.buttonPressed,
        "card-dark": colors.cardDark,
        "card-dark-deep": colors.cardDarkDeep,
        "card-dark-text": colors.cardDarkText,
        "card-dark-label": colors.cardDarkLabel,
        "card-bg": colors.cardBg,
        "input-bg": colors.inputBg,
      },
      borderRadius: {
        card: `${radius.card}px`,
        button: `${radius.button}px`,
      },
      fontFamily: {
        tanker: ["Tanker", "serif"],
        satoshi: ["Satoshi", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
