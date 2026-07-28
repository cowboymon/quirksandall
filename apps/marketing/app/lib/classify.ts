import { THEMES } from "./themes";

// Best-effort theme classification for an incoming suggestion, via a single
// cheap Claude Haiku call. Returns a theme string, or null when no API key is
// configured or anything fails — the caller then leaves the suggestion
// untagged rather than erroring. Kept as a raw fetch (no SDK dependency) so the
// marketing app has nothing extra to install/deploy.
export async function classifyTheme(suggestion: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const system =
    "You categorise a short product suggestion for a pet-care app into exactly one theme. " +
    "Reply with ONLY the theme text, copied verbatim from the list, and nothing else.\nThemes:\n" +
    THEMES.map((t) => `- ${t}`).join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 24,
        system,
        messages: [{ role: "user", content: suggestion.slice(0, 2000) }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content?.find((b) => b.type === "text")?.text ?? "").trim().toLowerCase();
    if (!text) return null;
    const match = THEMES.find((t) => text === t.toLowerCase() || text.includes(t.toLowerCase()));
    return match ?? "Something else";
  } catch {
    return null;
  }
}
