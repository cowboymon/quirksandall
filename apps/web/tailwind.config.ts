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
        "card-dark": colors.cardDark,
        "card-dark-text": colors.cardDarkText,
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
