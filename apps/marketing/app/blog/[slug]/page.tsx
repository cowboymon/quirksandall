import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Markdown from "../../components/Markdown";
import PostBadges from "../../components/PostBadges";
import { getPost, publishedPosts } from "../../lib/blog";

// Pre-render the published posts; drafts resolve to null → notFound in prod.
export function generateStaticParams() {
  return publishedPosts().map((p) => ({ slug: p.slug }));
}
export const dynamicParams = true;
// Regenerate hourly so a scheduled post starts resolving on its publishAt date.
export const revalidate = 3600;

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Dark hero: the display-face title lives here (once per page), with a
            quiet dog motif and the category/reading-time metadata. */}
        <section className="bg-card-dark text-card-dark-text">
          <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
            <Link
              href="/blog"
              className="text-sm font-medium text-card-dark-text/70 transition-colors hover:text-card-dark-text"
            >
              ← All guides
            </Link>
            <div className="mt-6">
              <PostBadges
                category={post.category}
                readingMinutes={post.readingMinutes}
                freebie={post.freebie}
                date={post.dateLabel}
                tone="dark"
              />
              <h1 className="mt-3 font-tanker text-3xl leading-tight sm:text-4xl">{post.title}</h1>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.illustration}
                alt=""
                aria-hidden
                className="mt-7 h-20 w-20 object-contain sm:h-24 sm:w-24"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
          <article className="prose-post">
            <Markdown>{post.body}</Markdown>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
