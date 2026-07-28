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
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  icons: {
    icon: "/brand/icon.png",
    apple: "/brand/icon.png",
  },
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    url: site.url,
    locale: "en_AU",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${site.name} — ${site.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: ["/og.png"],
  },
};

// Site-wide structured data. Organization identifies the publisher; WebSite
// names the site as an entity. Search engines and AI answer engines lean on
// this to understand and cite the product. Page-specific schema
// (SoftwareApplication, FAQPage) lives on the homepage.
const orgLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#org`,
      name: site.maker,
      url: site.url,
      logo: `${site.url}/brand/icon.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      url: site.url,
      description: site.description,
      inLanguage: "en-AU",
      publisher: { "@id": `${site.url}/#org` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${satoshi.variable} ${tanker.variable}`}>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
      </body>
    </html>
  );
}
