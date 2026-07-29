// Fire a Pirsch custom event. Pirsch exposes a global `pirsch()` once its
// script has loaded; this wrapper guards for that (and for the script being
// blocked) so a tracking call can never break a real user action.
//
// Server-rendered links use the `pirsch-event` HTML attributes instead — this
// helper is for client components where the event fires on async success
// (form submits, votes) rather than a raw click.

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

// Build Pirsch's DOM-attribute event props (`pirsch-event` / `pirsch-meta-*`)
// for server-rendered links, where the click happens in plain HTML with no
// client handler. React's JSX types don't know these custom attributes, so we
// return them as an index-signature object — spreading that onto an element
// keeps call sites tidy and sidesteps the unknown-attribute type error.
export function pirschEvent(name: string, meta?: Record<string, string>): Record<string, string> {
  const attrs: Record<string, string> = { "pirsch-event": name };
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      attrs[`pirsch-meta-${key}`] = value;
    }
  }
  return attrs;
}
