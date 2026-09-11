// App Store rating prompt, tied to the moment the app has just visibly
// delivered its core value: the owner finished sharing a link. Never asked
// anywhere near the missing-pet flow.
//
// Gates, in order:
//  • Only from the second successful share ever — a first-time sharer is
//    still forming an opinion.
//  • At most once every ~4 months. Apple's own budget for the system prompt
//    is 3 shows per 365 days per user; spacing our REQUESTS wider than that
//    means a request is never silently swallowed for quota reasons, so the
//    ones we make land at the moment we chose.
//  • The dialog itself is SKStoreReviewController — iOS decides whether to
//    actually show it, there's nothing to dismiss twice, and it can't be
//    abused into a nag.
import AsyncStorage from "@react-native-async-storage/async-storage";

// Loaded on demand rather than imported at module scope. expo-store-review is
// not bundled in Expo Go, and there the import throws on evaluation — before
// the try/catch below exists to swallow it, and early enough to take the
// dashboard down with it, since that is what imports this file. A missing
// native module should be one more reason we quietly don't ask, which is
// exactly what the rest of this module already does for every other failure.
type StoreReviewModule = typeof import("expo-store-review");

function loadStoreReview(): StoreReviewModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-store-review") as StoreReviewModule;
  } catch {
    return null;
  }
}

const SHARE_COUNT_KEY = "review.shareCount";
const LAST_ASK_KEY = "review.lastAskAt";
const MIN_SHARES = 2;
const MIN_DAYS_BETWEEN_ASKS = 122;

/** Call after a share sheet completes with an actual send (not a dismiss). */
export async function recordShareAndMaybeAskForReview(): Promise<void> {
  try {
    const count = parseInt((await AsyncStorage.getItem(SHARE_COUNT_KEY)) ?? "0", 10) + 1;
    await AsyncStorage.setItem(SHARE_COUNT_KEY, String(count));
    if (count < MIN_SHARES) return;

    const lastAsk = parseInt((await AsyncStorage.getItem(LAST_ASK_KEY)) ?? "0", 10);
    if (lastAsk && Date.now() - lastAsk < MIN_DAYS_BETWEEN_ASKS * 86400000) return;

    const StoreReview = loadStoreReview();
    if (!StoreReview) return;
    if (!(await StoreReview.isAvailableAsync())) return;

    // Stamp BEFORE requesting — if the request throws we'd rather skip a
    // cycle than double-ask.
    await AsyncStorage.setItem(LAST_ASK_KEY, String(Date.now()));
    // A beat after the share sheet fully dismisses, so the system dialog
    // doesn't collide with its closing animation.
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 800);
  } catch {
    // A review nudge must never break sharing.
  }
}
