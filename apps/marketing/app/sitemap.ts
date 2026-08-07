import type { MetadataRoute } from "next";
import { site } from "./site";
import { publishedPosts } from "./lib/blog";

// Public, indexable pages. /admin and the API routes are intentionally omitted.
// Blog posts are appended from the content source so new posts show up
// automatically; drafts are excluded (publishedPosts()).
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/roadmap", priority: 0.8, changeFrequency: "weekly" },
    { path: "/support", priority: 0.4, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/changelog", priority: 0.2, changeFrequency: "yearly" },
  ];
  const now = new Date();

  const staticEntries = pages.map((p) => ({
    url: `${site.url}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const postEntries = publishedPosts().map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries];
}
