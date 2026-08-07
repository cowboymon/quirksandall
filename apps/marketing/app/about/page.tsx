import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Markdown from "../components/Markdown";
import { site } from "../site";

export const metadata: Metadata = {
  title: "About",
  description: `Why we built ${site.name} — the story of one dog, Olive, and everything you end up texting a sitter anyway.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const raw = fs.readFileSync(path.join(process.cwd(), "content", "about.md"), "utf8");
  // Lift the title into the hero; render the rest as the article body.
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "About";
  const body = titleMatch
    ? raw.slice(raw.indexOf(titleMatch[0]) + titleMatch[0].length).replace(/^\s+/, "")
    : raw;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-card-bg">
        {/* Dark hero — the story is Olive's, so the dog gets to lead here. */}
        <section className="bg-card-dark text-card-dark-text">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-14 text-center sm:py-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/bed-pink.svg"
              alt=""
              aria-hidden
              className="mb-5 h-20 w-20 object-contain sm:h-24 sm:w-24"
            />
            <p className="eyebrow text-card-dark-label">Our story</p>
            <h1 className="mt-2 font-tanker text-4xl leading-none sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-card-dark-text/80">
              One dog, Olive, and everything you end up texting a sitter anyway.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
          <article className="prose-post">
            <Markdown>{body}</Markdown>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
