"use client";

import Script from "next/script";

// Swetrix — privacy-friendly, cookieless analytics (Cloud, api.swetrix.com).
// No cookies and no personal data, so no consent banner is required. Loaded
// only when NEXT_PUBLIC_SWETRIX_PID is set; init runs on script load so it
// works regardless of DOMContentLoaded timing under next/script.
declare global {
  interface Window {
    swetrix?: { init: (pid: string) => void; trackViews: () => void };
  }
}

export default function Analytics({ pid }: { pid: string }) {
  return (
    <Script
      src="https://swetrix.org/swetrix.js"
      strategy="afterInteractive"
      onLoad={() => {
        window.swetrix?.init(pid);
        window.swetrix?.trackViews();
      }}
    />
  );
}
