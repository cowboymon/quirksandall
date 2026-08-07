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
  const body = fs.readFileSync(path.join(process.cwd(), "content", "about.md"), "utf8");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <article className="prose-post">
          <Markdown>{body}</Markdown>
        </article>
      </main>

      <Footer />
    </div>
  );
}
