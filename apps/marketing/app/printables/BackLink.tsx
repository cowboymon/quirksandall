"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SLUG = /^[a-z0-9-]+$/;

// Articles link to a printable with ?from=<post-slug>. Read it on the client
// (keeps the page static) and point "Back" at the guide you came from;
// otherwise fall back to the guides index.
export default function BackLink({ className }: { className?: string }) {
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("from");
    if (f && SLUG.test(f)) setFrom(f);
  }, []);

  return from ? (
    <Link href={`/blog/${from}`} className={className}>
      ← Back to the guide
    </Link>
  ) : (
    <Link href="/blog" className={className}>
      ← Back to guides
    </Link>
  );
}
