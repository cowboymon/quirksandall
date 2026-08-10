"use client";

import { track } from "../lib/pirsch";

// Screen-only "Print / Save as PDF" trigger. Hidden in the printed output
// via the .print-hide utility. Firing the event before print() is the actual
// freebie-conversion signal (a page view only tells us the template was opened).
export default function PrintButton({ slug }: { slug: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        track("Printable Printed", { template: slug });
        window.print();
      }}
      className="print-hide rounded-button bg-button px-5 py-2.5 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
    >
      Print / Save as PDF
    </button>
  );
}
