const { colors, radius } = require("../../packages/shared/src/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        background: colors.background,
        "text-muted": colors.textMuted,
        border: colors.border,
        success: colors.success,
        caution: colors.caution,
        danger: colors.danger,
        "card-dark": colors.cardDark,
        "input-bg": colors.inputBg,
      },
      borderRadius: {
        card: `${radius.card}px`,
        button: `${radius.button}px`,
      },
    },
  },
  plugins: [],
};
