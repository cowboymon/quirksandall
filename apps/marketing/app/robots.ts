import type { MetadataRoute } from "next";
import { site } from "./site";

// Allow general crawlers and, explicitly, the major AI answer engines — being
// crawlable by them is the point of GEO (getting cited in ChatGPT / Perplexity
// / Google AI Overviews / Claude). Keep the admin dashboard and API out of the
// index. To opt out of an AI engine later, add a disallow block for its agent.
const AI_AGENTS = [
  "GPTBot", // OpenAI (training)
  "OAI-SearchBot", // OpenAI (ChatGPT browsing/search)
  "ChatGPT-User", // OpenAI (user-triggered fetches)
  "ClaudeBot", // Anthropic
  "Claude-User",
  "PerplexityBot", // Perplexity
  "Google-Extended", // Google Gemini / AI Overviews grounding
  "Applebot-Extended", // Apple Intelligence
  "CCBot", // Common Crawl (feeds many models)
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: "/", disallow: ["/admin", "/api/"] })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
