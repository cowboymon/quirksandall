// The cat-arm swipe is a motion flourish. Anyone who prefers reduced motion
// always swaps straight to the confirmation — no arm, no animation.
//
// By default it's desktop-only (the long arm needs room and the forms differ
// on narrow screens). Pass allowMobile=true to run it at all widths — used by
// the home-page waitlist, which is tuned for its stacked mobile layout.
export function prefersPawSwipe(allowMobile = false): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (!allowMobile && !window.matchMedia("(min-width: 768px)").matches) return false;
  return true;
}
