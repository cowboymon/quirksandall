import type { Metadata } from "next";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import WaitlistForm from "../components/WaitlistForm";
import StoreBadge from "../components/StoreBadge";
import BlogFilter from "./BlogFilter";
import { site } from "../site";
import { publishedPosts } from "../lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Practical guides for handing your pet over to a sitter, walker, or boarder — checklists, templates, and the details owners forget to mention.",
  alternates: { canonical: "/blog" },
};

// Regenerate hourly so scheduled posts (publishAt) appear on their date.
export const revalidate = 3600;

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
          <BlogFilter
            posts={posts.map((p) => ({
              slug: p.slug,
              title: p.title,
              description: p.description,
              category: p.category,
              freebie: p.freebie,
            }))}
          />
        </div>

        {/* Waitlist module — same one as the home page's final CTA. */}
        <section className="bg-card-dark text-card-dark-text">
          <div className="relative mx-auto max-w-3xl overflow-hidden px-6 py-20 text-center sm:py-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/cta-dog.svg"
              alt=""
              aria-hidden
              className="mx-auto mb-5 h-24 w-24 sm:h-28 sm:w-28"
            />
            <h2 className="font-tanker text-4xl leading-tight sm:text-5xl">Away, but known.</h2>

            <div className="mt-6 flex justify-center">
              <WaitlistForm
                source="footer"
                tone="dark"
                intro="We're putting the finishing touches on it. Leave your email and we'll tell you the moment it's live."
              />
            </div>

            <div className="mt-10 flex flex-nowrap items-center justify-center gap-3">
              <StoreBadge kind="apple" href={site.appStoreUrl} onDark />
              <StoreBadge kind="google" href={site.playStoreUrl} onDark />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
