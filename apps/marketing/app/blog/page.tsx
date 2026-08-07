import type { Metadata } from "next";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PostBadges from "../components/PostBadges";
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

      <main className="flex-1">
        {/* Dark hero band — the contrast beat, and the one place the dog motif
            gets to be a moment on this page. */}
        <section className="bg-card-dark text-card-dark-text">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-14 text-center sm:py-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/laptop-pink.png"
              alt=""
              aria-hidden
              className="mb-5 h-20 w-20 object-contain sm:h-24 sm:w-24"
            />
            <p className="eyebrow text-card-dark-label">Guides</p>
            <h1 className="mt-2 font-tanker text-4xl leading-none sm:text-5xl">
              Guides for handing over your pet
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-card-dark-text/80">
              Checklists, templates, and the specific things owners forget to tell a sitter — so
              whoever steps in isn&apos;t guessing.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex items-start gap-4 rounded-card border border-border bg-card-bg p-6 transition-colors hover:border-primary/50 sm:gap-6 sm:p-7"
                >
                  <div className="min-w-0 flex-1">
                    <PostBadges category={post.category} readingMinutes={post.readingMinutes} />
                    <h2 className="mt-3 text-xl font-bold leading-tight text-foreground group-hover:text-primary">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-base leading-relaxed text-text-muted">
                      {post.description}
                    </p>
                    <span className="mt-3 inline-block text-sm font-medium text-primary">
                      Read the guide →
                    </span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.illustration}
                    alt=""
                    aria-hidden
                    className="hidden h-20 w-20 shrink-0 self-center object-contain sm:block"
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-12 rounded-card border border-border bg-card-bg p-6 text-center sm:p-8">
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
