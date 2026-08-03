// Lets screens wait for the splash to actually leave before doing anything
// attention-grabbing. The auth screen mounts UNDER the held splash (the auth
// gate resolves faster than the 2s hold), and an autoFocus there raised the
// keyboard behind the splash — so it was already up before the user ever saw
// the field it belongs to. Focus is a "screen is visible" behaviour, so it
// waits for this promise.
let resolveHidden: () => void;
export const splashHidden = new Promise<void>((r) => { resolveHidden = r; });
export function markSplashHidden() { resolveHidden(); }
