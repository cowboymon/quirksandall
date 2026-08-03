import { useState } from "react";
import { AppAlert } from "../stores/appAlert";
import { supabase } from "../lib/supabase";
import { purchasePlan, restorePurchases, identifyPurchaser, type Plan, type UnlockRecord } from "../lib/purchases";
import { track, AnalyticsEvent } from "../lib/analytics";

// Persist the unlock on the owners row. Client-side stopgap: the RevenueCat
// webhook (supabase/functions/revenuecat-webhook) writes the same shape
// server-side and is the authority once configured — this write just makes
// the unlock instant in-session instead of waiting a webhook round-trip.
async function persistUnlock(record: UnlockRecord) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("owners").update(record).eq("id", user.id);
}

// Orchestrates the purchase/restore flow: analytics, RevenueCat, the owners-row
// write, and the resulting alert. Extracted out of the paywall screen so the
// screen only renders UI and calls purchase()/restore().
export function usePurchaseFlow(source: string) {
  const [loading, setLoading] = useState(false);

  const purchase = async (plan: Plan, onUnlocked: () => void) => {
    setLoading(true);
    track(AnalyticsEvent.PurchaseStarted, { source, plan });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await identifyPurchaser(user.id);
      const record = await purchasePlan(plan);
      if (record) {
        track(AnalyticsEvent.PurchaseCompleted, { source, plan });
        await persistUnlock(record);
        AppAlert.alert(
          "Unlocked.",
          "The full picture is live now — routines and the softer stuff.",
          [{ text: "Got it", onPress: onUnlocked }]
        );
      }
    } catch (e: any) {
      if (!e.message?.includes("cancel")) AppAlert.alert("Purchase failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const restore = async (onRestored: () => void) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await identifyPurchaser(user.id);
      const record = await restorePurchases();
      if (record) {
        track(AnalyticsEvent.PurchaseRestored, { source });
        await persistUnlock(record);
        AppAlert.alert("Restored", "Full access is back.", [{ text: "Got it", onPress: onRestored }]);
      } else {
        AppAlert.alert("Nothing to restore", "No previous purchase found for this account.");
      }
    } catch (e: any) {
      AppAlert.alert("Restore failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, purchase, restore };
}
