import type { Category } from "../lib/blog";

// Category tag + reading-time, shown near a post's title on the index (light)
// and in the post hero (dark). Keeps the two surfaces consistent.
export default function PostBadges({
  category,
  readingMinutes,
  tone = "light",
}: {
  category: Category;
  readingMinutes: number;
  tone?: "light" | "dark";
}) {
  const tagClass =
    tone === "dark"
      ? "border-card-dark-text/30 text-card-dark-text"
      : "border-border text-primary";
  const timeClass = tone === "dark" ? "text-card-dark-text/70" : "text-text-muted";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tagClass}`}
      >
        {category}
      </span>
      <span className={`text-xs ${timeClass}`}>{readingMinutes} min read</span>
    </div>
  );
}
