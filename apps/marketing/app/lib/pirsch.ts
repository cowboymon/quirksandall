// Fire a Pirsch custom event. Pirsch exposes a global `pirsch()` once its
// script has loaded; this wrapper guards for that (and for the script being
// blocked) so a tracking call can never break a real user action.
//
// Used both by form success handlers and by TrackedLink click handlers. We
// deliberately don't use Pirsch's pirsch-event HTML attributes: pa.js only
// binds those on DOMContentLoaded, which has already fired by the time the
// deferred script loads in a Next.js app, so those events never register.

type PirschMeta = Record<string, string | number | boolean>;

declare global {
  interface Window {
    pirsch?: (name: string, options?: { duration?: number; meta?: PirschMeta }) => void;
  }
}

export function track(name: string, meta?: PirschMeta): void {
  if (typeof window === "undefined") return;
  try {
    window.pirsch?.(name, meta ? { meta } : undefined);
  } catch {
    // Analytics must never surface an error to the user.
  }
}
