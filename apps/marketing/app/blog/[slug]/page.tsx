import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Markdown from "../../components/Markdown";
import { getPost, publishedPosts } from "../../lib/blog";

// Pre-render the published posts; drafts resolve to null → notFound in prod.
export function generateStaticParams() {
  return publishedPosts().map((p) => ({ slug: p.slug }));
}
export const dynamicParams = true;

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

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
          ← All guides
        </Link>
        <article className="prose-post mt-6">
          <Markdown>{post.body}</Markdown>
        </article>
      </main>

      <Footer />
    </div>
  );
}
