import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRINTABLES, getPrintable, type Block } from "../data";
import PrintButton from "../PrintButton";
import BackLink from "../BackLink";
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

// A labelled field: label beside a bordered box to write in (official-form style).
function Field({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="fbox">
      <span className="fbox-label">
        {label}
        {hint ? <span className="fbox-hint"> ({hint})</span> : null}
      </span>
      <span className="fbox-input" aria-hidden />
    </div>
  );
}

function BlockBody({ block }: { block: Block }) {
  if (block.kind === "fields") {
    return (
      <>
        {block.items.map((it) => (
          <Field key={it.label} label={it.label} hint={it.hint} />
        ))}
      </>
    );
  }
  if (block.kind === "permission") {
    return (
      <>
        <blockquote className="doc-quote">“{block.quote}”</blockquote>
        {block.items.map((it) => (
          <Field key={it.label} label={it.label} hint={it.hint} />
        ))}
      </>
    );
  }
  if (block.kind === "table") {
    return (
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
    );
  }
  // write — grows to fill the section (min height keeps it usable in short ones)
  return <div className="write-box" style={{ minHeight: `${block.lines * 1.7}rem` }} aria-hidden />;
}

function BlockView({ block, index }: { block: Block; index: number }) {
  return (
    <section className="doc-block">
      <div className="doc-gutter">
        <span className="doc-num">{index}</span>
        <span className="doc-vlabel">{block.heading}</span>
      </div>
      <div className="doc-content">
        {"note" in block && block.note ? <p className="doc-note">{block.note}</p> : null}
        <BlockBody block={block} />
      </div>
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
        <BackLink className="text-sm font-medium text-primary hover:underline" />
        <PrintButton />
      </div>

      <div className="mx-auto my-8 w-full max-w-3xl px-4 sm:px-6">
        <article className="doc">
          <header className="doc-header">
            <p className="doc-kicker">Pet care handover template</p>
            <h1 className="doc-title">{doc.title}</h1>
            <p className="doc-formid">Please complete in pen · one form per pet</p>
            <p className="doc-intro">{doc.intro}</p>
          </header>

          {doc.blocks.map((b, i) => (
            <BlockView key={b.heading} block={b} index={i + 1} />
          ))}

          {/* The single branded element. */}
          <footer className="doc-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-footer.png" alt={site.name} className="doc-brand-logo" />
            <div>
              <p className="doc-brand-text">{doc.footnote}</p>
              <p className="doc-brand-url">{site.url.replace(/^https?:\/\//, "")}</p>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
