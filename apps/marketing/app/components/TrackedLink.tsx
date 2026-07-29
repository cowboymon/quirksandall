"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { track } from "../lib/pirsch";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: string;
  meta?: Record<string, string>;
  children: ReactNode;
};

// A plain <a> that fires a Pirsch event on click. We call window.pirsch()
// directly rather than using Pirsch's pirsch-event HTML attributes: pa.js only
// binds those on DOMContentLoaded, which has already fired by the time the
// deferred script loads in a Next.js app, so attribute events never register.
// A React handler is immune to that timing and to client-side navigation.
// Server components can render this — it just needs to be a client boundary.
export default function TrackedLink({ event, meta, onClick, children, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        track(event, meta);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
