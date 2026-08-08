import { site } from "../site";
import { PRICING, LIFETIME_AVAILABLE } from "@quirksandall/shared";
import { publishedPosts } from "../lib/blog";

// llms.txt — a curated, plain-Markdown summary of the site for AI answer
// engines and PageSpeed's Agentic Browsing check. The prose is hand-written
// (it can't be derived from pages); the Pages and Blog link lists are
// generated so new content appears automatically. Regenerated hourly.
export const revalidate = 3600;

const STATIC_PAGES: { title: string; path: string }[] = [
  { title: "Home", path: "/" },
  { title: "About", path: "/about" },
  { title: "Blog", path: "/blog" },
  { title: "Roadmap", path: "/roadmap" },
  { title: "Support", path: "/support" },
  { title: "Privacy", path: "/privacy" },
  { title: "Terms", path: "/terms" },
  { title: "Legal change history", path: "/legal/changelog" },
];

function pricingSection(): string {
  const free =
    "- Free forever: pet ID, commands, allergies, medications and doses, escape/flight-risk flag, PIN-gated emergency contacts, feeding times, one shareable link, the missing-pet poster, and the document vault. Medical information is never behind a paywall.";
  const pro = LIFETIME_AVAILABLE
    ? `- Pro unlock: ${PRICING.annual}/year (auto-renewing) or a one-time ${PRICING.lifetime} lifetime payment — unlimited pets, a separate live link per stand-in, and the full daily routine (walks, sleep, bathroom, plus temperament, fears and no-go zones).`
    : `- Pro unlock: ${PRICING.annual}/year (auto-renewing, cancel anytime) — unlimited pets, a separate live link per stand-in, and the full daily routine (walks, sleep, bathroom, plus temperament, fears and no-go zones).`;
  return `${free}\n${pro}`;
}

export function GET() {
  const posts = publishedPosts();

  const body = `# ${site.name}

> ${site.name} is a mobile app (iOS and Android) that lets pet owners share everything a sitter, walker, or boarder needs to know about their pet — through a single link the stand-in opens in any web browser, with no app to download and no account to create on their end.

Made by ${site.maker}, the team behind ${site.makerOtherProduct}. Tagline: "${site.tagline}" Pre-launch — join the waitlist.

## What it does

- Fill in your pet's profile once: commands and how reliable each one is, allergies, medications and doses, feeding times, PIN-gated emergency contacts, an escape / flight-risk flag, and a document vault for vaccination and flea/worm records.
- Share a live link with whoever's looking after your pet. They open it in a browser — nothing to install, no sign-up.
- The link updates instantly whenever you edit the profile. You can name each link, see when it was last opened, and revoke it at any time.
- Generate a printable, shareable missing-pet poster straight from the profile. Free, always.

## How it works

1. Fill in the profile once (a few minutes, one time).
2. Share a single link with the person looking after your pet — they open it in any browser.
3. The link stays current automatically; revoke it when the stay is over.

## Pricing

${pricingSection()}

## Key facts

- Works for any pet — dogs, cats, rabbits, birds — not only dogs.
- Widely used for cats: a cat's profile can cover feeding and which food, litter location and scooping, medications and how to give them, indoor-only or outdoor status, the escape/door-dash risk, and where the cat hides from strangers — everything a cat sitter needs, on one link with no app to install.
- The person looking after your pet never needs the app or an account; they just open a link.
- Sensitive details (emergency contacts, insurance) sit behind a 4-digit PIN the owner sets.
- The free tier is permanent; medical information is never paywalled.

## Pages

${STATIC_PAGES.map((p) => `- [${p.title}](${site.url}${p.path})`).join("\n")}
- [Contact](mailto:${site.contactEmail})

## Blog

Practical guides on handing a pet over to a sitter, walker, or boarder.

${posts.map((p) => `- [${p.title}](${site.url}/blog/${p.slug}): ${p.description}`).join("\n")}
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
