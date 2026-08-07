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
export type PostMeta = { slug: string; draft: boolean; category: Category };

// Order here is the order shown on the index. Drafts are staged but excluded
// from the index, sitemap, llms.txt, and 404 in production (see getPost).
export const POSTS: PostMeta[] = [
  { slug: "pet-sitter-handover-checklist", draft: false, category: "General" },
  { slug: "free-pet-sitter-instructions-template", draft: false, category: "General" },
  { slug: "emergency-information-for-pet-sitters", draft: false, category: "General" },
  { slug: "preparing-a-friend-to-pet-sit", draft: false, category: "General" },
  { slug: "things-owners-forget-to-tell-sitters", draft: false, category: "General" },
  { slug: "weird-habits-your-pet-sitter-needs-to-know", draft: false, category: "General" },
  { slug: "what-to-leave-for-a-dog-sitter", draft: false, category: "Dogs" },
  { slug: "explaining-your-dogs-commands-and-triggers", draft: false, category: "Dogs" },
  // Held for veterinary review before publishing — behavioural/medical claims.
  { slug: "what-to-leave-for-a-cat-sitter", draft: true, category: "Cats" },
  { slug: "what-to-do-when-a-cat-hides-from-their-sitter", draft: true, category: "Cats" },
  { slug: "indoor-cat-escape-prevention-checklist", draft: true, category: "Cats" },
  { slug: "leaving-an-anxious-dog-with-a-sitter", draft: true, category: "Dogs" },
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
  readingMinutes: number;
  illustration: string;
  draft: boolean;
  date: string;
};

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
    readingMinutes: readingMinutes(afterTitle),
    illustration: illustrationFor(POSTS.indexOf(meta)),
    draft: meta.draft,
    date: BLOG_DATE,
  };
}

/** All posts including drafts (build/tools only). */
export function allPosts(): Post[] {
  return POSTS.map(readPost);
}

/** Posts safe to list/index — drafts removed. */
export function publishedPosts(): Post[] {
  return POSTS.filter((p) => !p.draft).map(readPost);
}

/**
 * A single post by slug, or null. Drafts resolve to null in production so they
 * 404 while staying viewable in local dev.
 */
export function getPost(slug: string): Post | null {
  const meta = POSTS.find((p) => p.slug === slug);
  if (!meta) return null;
  if (meta.draft && process.env.NODE_ENV === "production") return null;
  return readPost(meta);
}
