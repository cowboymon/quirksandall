import type { MetadataRoute } from "next";
import { site } from "./site";

// Public, indexable pages. /admin and the API routes are intentionally omitted.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/roadmap", priority: 0.8, changeFrequency: "weekly" },
    { path: "/support", priority: 0.4, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  ];
  const lastModified = new Date();
  return pages.map((p) => ({
    url: `${site.url}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
