import fs from "node:fs";
import path from "node:path";

// The blog is a set of Markdown files in content/blog. Metadata that isn't in
// the prose (slug, draft status, category) lives here; the title and
// description are derived from the file so there's a single source of truth
// for the words.
//
// To publish a held post: flip draft to false. To add a post: drop a
// <slug>.md in content/blog and add a row here.
export type Category = "Dogs" | "Cats" | "General";
// `freebie` marks posts that offer a printable download — surfaced as a
// secondary tag (the label is the tag text). `publishAt` (ISO date) schedules
// a post: it stays hidden — off the index, sitemap, llms.txt, and 404 — until
// that date, then appears automatically (the blog pages revalidate hourly).
export type PostMeta = {
  slug: string;
  draft: boolean;
  category: Category;
  freebie?: string;
  publishAt?: string;
};

// Order here is the order shown on the index (newest first). Drafts/scheduled
// posts are excluded until live (see isLive / getPost).
export const POSTS: PostMeta[] = [
  // Scheduled drops — two per week, revealed by date (newest first).
  { slug: "briefing-a-sitter-on-a-senior-dog", draft: false, category: "Dogs", publishAt: "2026-09-29" },
  { slug: "briefing-a-sitter-on-noise-phobia", draft: false, category: "Dogs", publishAt: "2026-09-25" },
  { slug: "multi-cat-household-quirks", draft: false, category: "Cats", publishAt: "2026-09-22" },
  { slug: "toxic-foods-and-plants-for-dogs", draft: false, category: "Dogs", publishAt: "2026-09-18" },
  { slug: "briefing-a-sitter-on-a-senior-cat", draft: false, category: "Cats", publishAt: "2026-09-15" },
  { slug: "dangerous-houseplants-for-cats", draft: false, category: "Cats", publishAt: "2026-09-08" },
  { slug: "what-to-do-when-your-pet-goes-missing", draft: false, category: "General", publishAt: "2026-09-04" },
  { slug: "briefing-a-sitter-for-a-multi-pet-household", draft: false, category: "General", publishAt: "2026-09-01" },
  { slug: "what-to-put-in-writing-before-a-friend-house-sits", draft: false, category: "General", publishAt: "2026-08-28" },
  { slug: "setting-up-a-medication-schedule-for-your-sitter", draft: false, category: "General", publishAt: "2026-08-25" },
  { slug: "post-trip-sitter-debrief", draft: false, category: "General", publishAt: "2026-08-21" },
  { slug: "getting-a-cat-to-eat-for-a-stranger", draft: false, category: "Cats", publishAt: "2026-08-18" },
  { slug: "choosing-boarding-marketplace-or-friend", draft: false, category: "General", publishAt: "2026-08-14" },
  { slug: "dog-escape-prevention", draft: false, category: "Dogs", publishAt: "2026-08-11" },

  { slug: "pet-sitter-handover-checklist", draft: false, category: "General", freebie: "Free template", publishAt: "2026-08-04" },
  { slug: "free-pet-sitter-instructions-template", draft: false, category: "General", freebie: "Free template", publishAt: "2026-07-31" },
  { slug: "emergency-information-for-pet-sitters", draft: false, category: "General", freebie: "Free template", publishAt: "2026-07-28" },
  { slug: "preparing-a-friend-to-pet-sit", draft: false, category: "General", publishAt: "2026-07-24" },
  { slug: "things-owners-forget-to-tell-sitters", draft: false, category: "General", publishAt: "2026-07-21" },
  { slug: "weird-habits-your-pet-sitter-needs-to-know", draft: false, category: "General", publishAt: "2026-07-17" },
  { slug: "what-to-leave-for-a-dog-sitter", draft: false, category: "Dogs", publishAt: "2026-07-14" },
  { slug: "explaining-your-dogs-commands-and-triggers", draft: false, category: "Dogs", publishAt: "2026-07-10" },
  { slug: "what-to-leave-for-a-cat-sitter", draft: false, category: "Cats", publishAt: "2026-07-07" },
  { slug: "what-to-do-when-a-cat-hides-from-their-sitter", draft: false, category: "Cats", publishAt: "2026-07-03" },
  { slug: "indoor-cat-escape-prevention-checklist", draft: false, category: "Cats", publishAt: "2026-06-30" },
  { slug: "leaving-an-anxious-dog-with-a-sitter", draft: false, category: "Dogs", publishAt: "2026-06-26" },
];

// Publish date for the current content set (matches the privacy v1.0 date).
export const BLOG_DATE = "2026-08-04";

// The hand-drawn Olive, in different poses — rotated per post (by position in
// POSTS) so each guide gets its own dog instead of the same one everywhere.
// cta-dog stays the homepage signature and is left out of the rotation.
const ILLUSTRATIONS = [
  "/brand/balloon-pink.png",
  "/brand/hat-pink.svg",
  "/brand/skate-pink.svg",
  "/brand/flower-pink.svg",
  "/brand/laptop-pink.png",
  "/brand/bed-pink.svg",
];
function illustrationFor(index: number): string {
  return ILLUSTRATIONS[index % ILLUSTRATIONS.length];
}

export type Post = {
  slug: string;
  title: string;
  description: string;
  body: string;
  category: Category;
  freebie?: string;
  readingMinutes: number;
  illustration: string;
  draft: boolean;
  date: string;
  dateLabel: string;
};

// "2026-08-04" → "4 August 2026", parsed by parts to avoid any timezone shift.
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function stripMarkdown(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ~200 words/minute, floored at 1 — a rough "how long is this" signal, not a
// precise stat. Computed from the visible prose, not the raw Markdown.
function readingMinutes(markdown: string): number {
  const words = stripMarkdown(markdown).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function readPost(meta: PostMeta): Post {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${meta.slug}.md`), "utf8");
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : meta.slug;

  // Description = first real paragraph after the title, trimmed to ~160 chars.
  const afterTitle = titleMatch ? raw.slice(raw.indexOf(titleMatch[0]) + titleMatch[0].length) : raw;
  const firstPara =
    afterTitle
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith("#")) ?? "";
  let description = stripMarkdown(firstPara);
  if (description.length > 160) {
    description = description.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  }

  // The rendered post shows the title in a hero, so drop the leading H1 from
  // the body to avoid printing it twice.
  const body = titleMatch ? afterTitle.replace(/^\s+/, "") : raw;

  return {
    slug: meta.slug,
    title,
    description,
    body,
    category: meta.category,
    freebie: meta.freebie,
    readingMinutes: readingMinutes(afterTitle),
    illustration: illustrationFor(POSTS.indexOf(meta)),
    draft: meta.draft,
    date: meta.publishAt ?? BLOG_DATE,
    dateLabel: formatDate(meta.publishAt ?? BLOG_DATE),
  };
}

// A post is live once it's not a draft and its scheduled date (if any) has
// passed. Evaluated at render time, so ISR reveals scheduled posts on the day.
function isLive(meta: PostMeta): boolean {
  if (meta.draft) return false;
  if (meta.publishAt && new Date(meta.publishAt) > new Date()) return false;
  return true;
}

/** All posts including drafts/scheduled (build/tools only). */
export function allPosts(): Post[] {
  return POSTS.map(readPost);
}

/** Posts safe to list/index — drafts and not-yet-published removed. */
export function publishedPosts(): Post[] {
  return POSTS.filter(isLive).map(readPost);
}

/**
 * A single post by slug, or null. In production a draft or not-yet-published
 * post resolves to null (404); in local dev any post is viewable by URL so a
 * scheduled post can be previewed before its date.
 */
export function getPost(slug: string): Post | null {
  const meta = POSTS.find((p) => p.slug === slug);
  if (!meta) return null;
  if (process.env.NODE_ENV === "production" && !isLive(meta)) return null;
  return readPost(meta);
}
