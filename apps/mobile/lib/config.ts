// Public web app base URL — recipient pages and poster generation live here.
// Override per environment with EXPO_PUBLIC_WEB_URL.
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://app.quirksandall.itshypothetical.com";

// Marketing site — separate domain from WEB_URL (the recipient-page app).
// Privacy Policy and Terms of Use live here, not on the app subdomain.
export const MARKETING_URL = "https://quirksandall.itshypothetical.com";
export const PRIVACY_URL = `${MARKETING_URL}/privacy`;
export const TERMS_URL = `${MARKETING_URL}/terms`;

// Shows the "Have a code?" redemption link on the paywall + account screens.
// OFF for the first App Store submission: the redemption backend
// (redemption_codes table + validate-code Edge Function → RevenueCat
// Promotional Entitlement) isn't built yet, and an unexplained link that
// leads to a "coming soon" placeholder is a real risk for App Review on
// the one IAP that submission exists to activate. Flip back on once the
// redemption backend ships.
export const REDEMPTION_ENABLED = false;
