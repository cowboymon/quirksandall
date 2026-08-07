import type { Category } from "../lib/blog";

// Category tag + reading-time, plus an optional "freebie" tag for posts that
// offer a printable download. Shown near a post's title in the hero (dark).
export default function PostBadges({
  category,
  readingMinutes,
  freebie,
  tone = "light",
}: {
  category: Category;
  readingMinutes: number;
  freebie?: string;
  tone?: "light" | "dark";
}) {
  const tagClass =
    tone === "dark"
      ? "border-card-dark-text/30 text-card-dark-text"
      : "border-border text-primary";
  const timeClass = tone === "dark" ? "text-card-dark-text/70" : "text-text-muted";
  // Filled pill so the freebie reads as a value cue, not just another label.
  const freebieClass =
    tone === "dark" ? "bg-card-dark-label text-card-dark" : "bg-primary text-card-dark-text";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tagClass}`}
      >
        {category}
      </span>
      {freebie ? (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${freebieClass}`}
        >
          {freebie}
        </span>
      ) : null}
      <span className={`text-xs ${timeClass}`}>{readingMinutes} min read</span>
    </div>
  );
}
