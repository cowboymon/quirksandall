import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Markdown from "../components/Markdown";
import { site } from "../site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects your information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const body = fs.readFileSync(path.join(process.cwd(), "content", "privacy.md"), "utf8");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <p className="eyebrow text-primary">Legal</p>
        <Markdown className="prose-legal mt-3">{body}</Markdown>
      </main>

      <Footer />
    </div>
  );
}
