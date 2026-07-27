// Public web app base URL — recipient pages and poster generation live here.
// Override per environment with EXPO_PUBLIC_WEB_URL.
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://quirksandall.itshypothetical.com";

// Shows the "Have a code?" redemption link on the paywall + account screens.
// Currently ON to preview the /redeem screen; the redemption backend
// (redemption_codes table + validate-code Edge Function → RevenueCat
// Promotional Entitlement) is still to be built.
export const REDEMPTION_ENABLED = true;
