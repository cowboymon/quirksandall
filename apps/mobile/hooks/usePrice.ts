// The unlock's display price, read from the store at runtime rather than
// hardcoded — so a price change in App Store Connect / Play Console takes
// effect with no app update, and each user sees their own currency
// ("A$12.99" in Australia, not a USD-looking "$7.99").
//
// Falls back to the static PRICE constant while loading and whenever the
// store is unreachable (Expo Go, missing RevenueCat key, offline), so the
// paywall copy never renders blank or half-formed.
import { useEffect, useState } from "react";
import { PRICE } from "@quirksandall/shared";
import { fetchPriceString } from "../lib/purchases";

// Module-scoped so the price is fetched once per app session and every later
// screen renders it immediately, instead of each paywall re-hitting the store
// and flashing the fallback first.
let cached: string | null = null;

export function usePrice(): string {
  const [price, setPrice] = useState<string>(cached ?? PRICE);

  useEffect(() => {
    if (cached) return;
    let active = true;
    fetchPriceString().then((p) => {
      if (!p) return;
      cached = p;
      if (active) setPrice(p);
    });
    return () => { active = false; };
  }, []);

  return price;
}
