import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";

export const ENTITLEMENT_ID = "pro";
// Not read anywhere at runtime — the purchase flow goes through RevenueCat's
// "current" Offering, not a hardcoded product lookup. Kept as documentation
// of which App Store Connect / RevenueCat product this app's unlock maps to.
export const PRODUCT_ID = "quirksandall_unlocked";

export function initRevenueCat() {
  // Prefer a platform-specific key; fall back to a single shared key
  // (e.g. a RevenueCat test-store key that works on both platforms).
  const apiKey =
    (Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_RC_IOS_KEY
      : process.env.EXPO_PUBLIC_RC_ANDROID_KEY) ?? process.env.EXPO_PUBLIC_RC_KEY;

  // IAP is stubbed until the RevenueCat keys exist. With no key — or in
  // Expo Go, where the native module isn't linked — skip configuration so
  // the app still launches. Wire the keys in and this activates automatically.
  if (!apiKey) return;

  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
  } catch (e) {
    console.warn("RevenueCat unavailable (expected in Expo Go):", e);
  }
}

export async function checkEntitlement(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

// The store's own localized price string for the unlock — e.g. "$7.99" in the
// US, "A$12.99" in Australia — read from the same Offering the purchase flow
// uses, so what we display is always exactly what the user gets charged.
// Returns null when unavailable (Expo Go, no key, offline); callers fall back
// to the static PRICE constant.
export async function fetchPriceString(): Promise<string | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages?.[0]?.product?.priceString ?? null;
  } catch {
    return null;
  }
}

export async function purchasePro(): Promise<boolean> {
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages?.[0];
  if (!pkg) throw new Error("No packages available");
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export async function restorePurchases(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
