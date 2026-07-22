import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";

export const ENTITLEMENT_ID = "pro";
export const PRODUCT_ID = "quirksandall_unlock";

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
