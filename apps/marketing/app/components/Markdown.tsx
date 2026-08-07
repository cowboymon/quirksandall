import { marked } from "marked";
import { site } from "../site";

marked.setOptions({ gfm: true });

// Authors end posts/pages with the literal token "[Get notified when it
// launches →]". Turn it into a real link from one place — swap site.getNotifiedHref
// when the app store link is live and every CTA follows.
function linkifyCta(md: string): string {
  return md.replaceAll(
    "[Get notified when it launches →]",
    `[Get notified when it launches →](${site.getNotifiedHref})`,
  );
}

// Renders trusted, first-party Markdown (our own content/*.md files) to HTML.
// dangerouslySetInnerHTML is safe here because the source is authored in-repo,
// not user input.
export default function Markdown({ children, className }: { children: string; className?: string }) {
  const html = marked.parse(linkifyCta(children), { async: false }) as string;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
