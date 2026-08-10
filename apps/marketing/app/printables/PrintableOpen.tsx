"use client";

import { useEffect } from "react";
import { track } from "../lib/pirsch";

// Fires once when a printable page opens. Complements the auto page view with
// the source article (the ?from slug the guides pass), so the
// guide → printable → print funnel is measurable. Renders nothing.
export default function PrintableOpen({ slug }: { slug: string }) {
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from") || "direct";
    track("Printable Opened", { template: slug, from });
  }, [slug]);

  return null;
}
