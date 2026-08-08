import { marked } from "marked";

marked.setOptions({ gfm: true });

// Authored posts/pages end with the literal token "[Get notified when it
// launches →]" (usually bolded). Pre-launch we don't want that inline CTA in
// the body prose, so strip the whole line here — one place, covers every
// content/*.md file. The standalone CTA on the blog index is separate JSX and
// is unaffected. (When a real install link exists, re-introduce a deliberate
// CTA rather than reviving this placeholder.)
function stripCta(md: string): string {
  return md.replace(/^.*Get notified when it launches.*$/gm, "").replace(/\n{3,}/g, "\n\n").trimEnd();
}

// Renders trusted, first-party Markdown (our own content/*.md files) to HTML.
// dangerouslySetInnerHTML is safe here because the source is authored in-repo,
// not user input.
export default function Markdown({ children, className }: { children: string; className?: string }) {
  const html = marked.parse(stripCta(children), { async: false }) as string;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
