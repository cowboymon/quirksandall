import fs from "node:fs";
import path from "node:path";

// The blog is a set of Markdown files in content/blog. Metadata that isn't in
// the prose (slug, draft status) lives here; the title and description are
// derived from the file so there's a single source of truth for the words.
//
// To publish a held post: flip draft to false. To add a post: drop a
// <slug>.md in content/blog and add a row here.
export type PostMeta = { slug: string; draft: boolean };

// Order here is the order shown on the index. Drafts are staged but excluded
// from the index, sitemap, llms.txt, and 404 in production (see getPost).
export const POSTS: PostMeta[] = [
  { slug: "pet-sitter-handover-checklist", draft: false },
  { slug: "free-pet-sitter-instructions-template", draft: false },
  { slug: "emergency-information-for-pet-sitters", draft: false },
  { slug: "preparing-a-friend-to-pet-sit", draft: false },
  { slug: "things-owners-forget-to-tell-sitters", draft: false },
  { slug: "weird-habits-your-pet-sitter-needs-to-know", draft: false },
  { slug: "what-to-leave-for-a-dog-sitter", draft: false },
  { slug: "explaining-your-dogs-commands-and-triggers", draft: false },
  // Held for veterinary review before publishing — behavioural/medical claims.
  { slug: "what-to-leave-for-a-cat-sitter", draft: true },
  { slug: "what-to-do-when-a-cat-hides-from-their-sitter", draft: true },
  { slug: "indoor-cat-escape-prevention-checklist", draft: true },
  { slug: "leaving-an-anxious-dog-with-a-sitter", draft: true },
];

// Publish date for the current content set (matches the privacy v1.0 date).
export const BLOG_DATE = "2026-08-04";

export type Post = {
  slug: string;
  title: string;
  description: string;
  body: string;
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

  return { slug: meta.slug, title, description, body: raw, draft: meta.draft, date: BLOG_DATE };
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
