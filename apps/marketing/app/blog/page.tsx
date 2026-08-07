import type { Metadata } from "next";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { site } from "../site";
import { publishedPosts } from "../lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Practical guides for handing your pet over to a sitter, walker, or boarder — checklists, templates, and the details owners forget to mention.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = publishedPosts();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <h1 className="font-tanker text-4xl leading-none text-foreground sm:text-5xl">
          Guides for handing over your pet
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-text-muted">
          Checklists, templates, and the specific things owners forget to tell a sitter — so whoever
          steps in isn&apos;t guessing.
        </p>

        <ul className="mt-10 flex flex-col divide-y divide-border/70 border-t border-border/70">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block py-6 transition-colors hover:bg-card-bg/60"
              >
                <h2 className="font-tanker text-2xl leading-tight text-foreground group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-2 text-base leading-relaxed text-text-muted">{post.description}</p>
                <span className="mt-3 inline-block text-sm font-medium text-primary">
                  Read the guide →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-14 rounded-card border border-border bg-card-bg p-6 text-center sm:p-8">
          <p className="text-lg text-foreground">
            Quirks &amp; All puts all of this on one link your sitter just opens.
          </p>
          <Link
            href={site.getNotifiedHref}
            className="mt-4 inline-block rounded-button bg-button px-5 py-3 text-sm font-medium text-card-dark-text transition-colors hover:bg-button-pressed"
          >
            Get notified when it launches →
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
