"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category } from "../lib/blog";

type Item = {
  slug: string;
  title: string;
  description: string;
  category: Category;
  freebie?: string;
};

// Category filter chips + the filtered list. Client-side and instant — the
// full post list is already in the page, so filtering is just local state.
// (If a post ever needs to live in two categories, change `category` to a
// `categories: Category[]` and swap the equality check for `.includes`.)
const ORDER: Category[] = ["Dogs", "Cats", "General"];

export default function BlogFilter({ posts }: { posts: Item[] }) {
  const [active, setActive] = useState<Category | "All">("All");

  // Only offer chips for categories that actually have posts, in a fixed order.
  const categories = useMemo(() => {
    const present = new Set(posts.map((p) => p.category));
    return ORDER.filter((c) => present.has(c));
  }, [posts]);

  const filtered = active === "All" ? posts : posts.filter((p) => p.category === active);

  const chip = (label: Category | "All", count: number) => {
    const on = active === label;
    return (
      <button
        key={label}
        type="button"
        onClick={() => setActive(label)}
        aria-pressed={on}
        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
          on
            ? "border-primary bg-primary text-card-dark-text"
            : "border-border bg-card-bg text-text-muted hover:border-primary/50 hover:text-foreground"
        }`}
      >
        {label} <span className="tabular-nums opacity-70">{count}</span>
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {chip("All", posts.length)}
        {categories.map((c) => chip(c, posts.filter((p) => p.category === c).length))}
      </div>

      <ul className="mt-8 flex flex-col gap-4">
        {filtered.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block rounded-card border border-border bg-card-bg p-6 transition-colors hover:border-primary/50 sm:p-7"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold leading-tight text-foreground group-hover:text-primary">
                  {post.title}
                </h2>
                {post.freebie ? (
                  <span className="mt-0.5 shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-card-dark-text">
                    {post.freebie}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-base leading-relaxed text-text-muted">{post.description}</p>
              <span className="mt-3 inline-block text-sm font-medium text-primary">
                Read the guide →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
