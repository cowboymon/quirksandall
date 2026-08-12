"use client";

import Link from "next/link";
import type { Category } from "../lib/blog";
import { track } from "../lib/pirsch";

type Item = {
  slug: string;
  title: string;
  description: string;
  category: Category;
  freebie?: string;
};

// End-of-post "Related guides" module — internal links that keep readers in the
// content and spread link equity to newer posts. Client-side only so a click can
// be tracked (the destination page view alone can't tell a related-link click
// from any other route in). The list itself is computed server-side.
export default function RelatedGuides({ from, items }: { from: string; items: Item[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="related-guides" className="mx-auto w-full max-w-3xl px-6 pb-14 sm:pb-20">
      <div className="border-t border-border pt-10">
        <h2 id="related-guides" className="font-tanker text-2xl leading-none text-foreground">
          Keep reading
        </h2>
        <ul className="mt-6 flex flex-col gap-4">
          {items.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                onClick={() => track("Related Guide Clicked", { from, to: post.slug })}
                className="group block rounded-card border border-border bg-card-bg p-5 transition-colors hover:border-primary/50 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold leading-tight text-foreground group-hover:text-primary">
                    {post.title}
                  </h3>
                  {post.freebie ? (
                    <span className="mt-0.5 shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-card-dark-text">
                      {post.freebie}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{post.description}</p>
                <span className="mt-2.5 inline-block text-sm font-medium text-primary">
                  Read the guide →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
