// Display prices for both plans, read from the store at runtime rather than
// hardcoded — so a price change in App Store Connect / Play Console takes
// effect with no app update, and each user sees their own currency rather
// than a USD-looking figure.
//
// Falls back to the static PRICING constants while loading and whenever the
// store is unreachable (Expo Go, missing RevenueCat key, offline), so paywall
// copy never renders blank or half-formed.
import { useEffect, useState } from "react";
import { PRICING } from "@quirksandall/shared";
import { fetchPriceStrings } from "../lib/purchases";

export type Prices = { lifetime: string; annual: string };

// Module-scoped so prices are fetched once per app session and every later
// screen renders them immediately, instead of each paywall re-hitting the
// store and flashing the fallback first.
let cached: Prices | null = null;

export function usePrices(): Prices {
  const [prices, setPrices] = useState<Prices>(cached ?? { ...PRICING });

  useEffect(() => {
    if (cached) return;
    let active = true;
    fetchPriceStrings().then((p) => {
      if (!p.lifetime && !p.annual) return; // store unreachable — keep fallback
      cached = { ...PRICING, ...p };
      if (active) setPrices(cached);
    });
    return () => { active = false; };
  }, []);

  return prices;
}
