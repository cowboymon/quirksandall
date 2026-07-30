import Purchases, { LOG_LEVEL, PACKAGE_TYPE, type CustomerInfo, type PurchasesPackage } from "react-native-purchases";
import { Platform } from "react-native";

export const ENTITLEMENT_ID = "pro";

// Two plans, one entitlement. Packages are looked up by RevenueCat package
// type — NEVER by array position: with two packages in the Offering,
// availablePackages[0] is whatever order the API returns, and picking by
// index is how you display one price and charge the other.
export type Plan = "lifetime" | "annual";
const PLAN_PACKAGE_TYPE: Record<Plan, PACKAGE_TYPE> = {
  lifetime: PACKAGE_TYPE.LIFETIME,
  annual: PACKAGE_TYPE.ANNUAL,
};

// Not read anywhere at runtime — the purchase flow goes through RevenueCat's
// "current" Offering. Kept as documentation of which App Store Connect /
// RevenueCat products this app's unlock maps to. Both must be attached to the
// "pro" entitlement; when the annual product is added in RevenueCat, removing
// the lifetime product from that entitlement would revoke every existing
// buyer, so old products stay mapped forever.
export const PRODUCT_IDS: Record<Plan, string> = {
  lifetime: "quirksandall_unlocked",
  annual: "quirksandall_annual",
};

// What a successful purchase/restore means for the owners row. Written by the
// client today as a stopgap; the RevenueCat webhook (functions/
// revenuecat-webhook) writes the same shape server-side and is the authority
// once configured.
export type UnlockRecord = {
  purchase_status: "paid";
  unlock_source: string;
  unlocked_at: string;
  expires_at: string | null; // null = lifetime; a date = subscription period end
};

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

// Tie the RevenueCat customer to the Supabase user id. Without this,
// purchases belong to an anonymous RevenueCat id and the server webhook's
// app_user_id can't be mapped to an owners row — the webhook would receive
// events it has to drop. Called before every purchase/restore and once per
// session from the dashboard; logIn is idempotent so the guard is just to
// avoid repeat network round-trips.
let identifiedAs: string | null = null;
export async function identifyPurchaser(userId: string): Promise<void> {
  if (!userId || identifiedAs === userId) return;
  try {
    await Purchases.logIn(userId);
    identifiedAs = userId;
  } catch {
    /* stubbed / offline — purchase flows surface their own errors */
  }
}

function packageFor(plan: Plan, packages: PurchasesPackage[]): PurchasesPackage | null {
  return packages.find((p) => p.packageType === PLAN_PACKAGE_TYPE[plan]) ?? null;
}

// Translate the active entitlement into the row we persist. expirationDate is
// null for the lifetime non-consumable and the period-end ISO date for the
// subscription — which is also how unlock_source is derived, so a product id
// rename can't silently misfile buyers.
function unlockRecordFrom(info: CustomerInfo): UnlockRecord | null {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  if (!ent) return null;
  return {
    purchase_status: "paid",
    unlock_source: ent.expirationDate ? "iap_annual" : "iap_lifetime",
    unlocked_at: ent.latestPurchaseDate ?? new Date().toISOString(),
    expires_at: ent.expirationDate ?? null,
  };
}

export async function checkEntitlement(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

// The store's own localized price string per plan — e.g. "A$29.99" /
// "A$9.99" in Australia — read from the same Offering the purchase flow uses,
// so what we display is always exactly what the user gets charged. Missing
// entries (Expo Go, no key, offline, package not yet configured) are absent
// from the result; callers fall back to the static PRICING constants.
export async function fetchPriceStrings(): Promise<Partial<Record<Plan, string>>> {
  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings.current?.availablePackages ?? [];
    const out: Partial<Record<Plan, string>> = {};
    for (const plan of ["lifetime", "annual"] as Plan[]) {
      const pkg = packageFor(plan, packages);
      if (pkg?.product?.priceString) out[plan] = pkg.product.priceString;
    }
    return out;
  } catch {
    return {};
  }
}

// Purchase a specific plan. Returns the unlock record to persist, or null if
// the purchase completed without the entitlement (shouldn't happen when both
// products are mapped to "pro").
export async function purchasePlan(plan: Plan): Promise<UnlockRecord | null> {
  const offerings = await Purchases.getOfferings();
  const pkg = packageFor(plan, offerings.current?.availablePackages ?? []);
  if (!pkg) throw new Error("That plan isn't available right now");
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return unlockRecordFrom(customerInfo);
}

export async function restorePurchases(): Promise<UnlockRecord | null> {
  const info = await Purchases.restorePurchases();
  return unlockRecordFrom(info);
}
