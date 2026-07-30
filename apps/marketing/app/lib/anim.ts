// The cat-arm swipe is a desktop-only flourish. Mobile and anyone who prefers
// reduced motion swap straight to the confirmation — no arm, no animation.
export function prefersPawSwipe(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return (
    window.matchMedia("(min-width: 768px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
