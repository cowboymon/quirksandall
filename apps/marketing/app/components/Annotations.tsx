/* Hand-drawn annotation marks — the locked "notes someone wrote about their
   pet" direction. Each mark is positioned by its parent to point at one
   specific thing; if a mark isn't pointing at something, it shouldn't exist.
   Colour comes from the parent via currentColor. */

/** Rough underline that stretches to the width of the word it sits under. */
export function Underline({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 16"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M4 9 C 52 4, 92 13, 140 8 C 190 3, 242 12, 296 7"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Not-quite-closed hand-drawn ellipse, oversized to loop around a word. */
export function CircleMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 90"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M112 8 C 172 6, 214 26, 209 47 C 204 74, 148 86, 94 83 C 40 80, 9 61, 13 38 C 17 16, 68 6, 130 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Margin arrow that flags the line beside it. Points right, toward the text. */
export function MarginArrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 72 46" fill="none" aria-hidden>
      <path
        d="M4 27 C 22 22, 42 20, 60 23"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M47 12 L 64 23 L 45 34"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
