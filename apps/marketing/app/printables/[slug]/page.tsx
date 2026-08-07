import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRINTABLES, getPrintable, type Block } from "../data";
import PrintButton from "../PrintButton";
import { site } from "../../site";

export function generateStaticParams() {
  return PRINTABLES.map((p) => ({ slug: p.slug }));
}
export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const doc = getPrintable(params.slug);
  if (!doc) return {};
  return {
    title: `${doc.title} — printable template`,
    description: doc.intro,
    alternates: { canonical: `/printables/${doc.slug}` },
  };
}

// A labelled blank line to write on.
function FillLine({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="fill">
      <span className="fill-label">
        {label}
        {hint ? <span className="fill-hint"> ({hint})</span> : null}
      </span>
      <span className="fill-line" aria-hidden />
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  return (
    <section className="doc-block">
      <h2 className="doc-h2">{block.heading}</h2>
      {"note" in block && block.note ? <p className="doc-note">{block.note}</p> : null}

      {block.kind === "fields" && (
        <div className="fill-grid">
          {block.items.map((it) => (
            <FillLine key={it.label} label={it.label} hint={it.hint} />
          ))}
        </div>
      )}

      {block.kind === "permission" && (
        <>
          <blockquote className="doc-quote">“{block.quote}”</blockquote>
          <div className="fill-grid">
            {block.items.map((it) => (
              <FillLine key={it.label} label={it.label} hint={it.hint} />
            ))}
          </div>
        </>
      )}

      {block.kind === "table" && (
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                {block.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: block.rows }).map((_, r) => (
                <tr key={r}>
                  {block.columns.map((c) => (
                    <td key={c}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {block.kind === "write" && (
        <div className="write-area">
          {Array.from({ length: block.lines }).map((_, i) => (
            <span key={i} className="fill-line" aria-hidden />
          ))}
        </div>
      )}
    </section>
  );
}

export default function PrintablePage({ params }: { params: { slug: string } }) {
  const doc = getPrintable(params.slug);
  if (!doc) notFound();

  return (
    <div className="printable-screen">
      {/* Screen-only toolbar */}
      <div className="print-hide mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 pt-8">
        <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
          ← Back to guides
        </Link>
        <PrintButton />
      </div>

      <article className="doc mx-auto my-8 max-w-3xl px-6">
        <header className="doc-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-footer.png" alt={site.name} className="doc-logo" />
          <h1 className="doc-title">{doc.title}</h1>
          <p className="doc-intro">{doc.intro}</p>
        </header>

        {doc.blocks.map((b) => (
          <BlockView key={b.heading} block={b} />
        ))}

        <p className="doc-footnote">{doc.footnote}</p>
        <p className="doc-url print-only">{site.url.replace(/^https?:\/\//, "")}</p>
      </article>
    </div>
  );
}
