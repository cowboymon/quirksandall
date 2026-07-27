import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { site } from "./site";

// Self-hosted brand fonts — the same licensed files the app ships with.
// Satoshi for body/UI, Tanker for display. No CDN dependency.
const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Satoshi-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const tanker = localFont({
  src: "./fonts/Tanker-Regular.ttf",
  weight: "400",
  variable: "--font-tanker",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  icons: {
    icon: "/brand/icon.png",
    apple: "/brand/icon.png",
  },
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${tanker.variable}`}>
      <body>{children}</body>
    </html>
  );
}
