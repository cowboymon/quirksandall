"use client";

// Screen-only "Print / Save as PDF" trigger. Hidden in the printed output
// via the .print-hide utility.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hide rounded-button bg-button px-5 py-2.5 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
    >
      Print / Save as PDF
    </button>
  );
}
