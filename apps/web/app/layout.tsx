import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted brand fonts — same licensed files the app and marketing site
// ship with. The recipient page is loaded by people without our app context
// (sitters on hotel wifi, etc.), so it must not depend on a third-party font
// CDN resolving at request time.
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
  title: "Quirks & All",
  description: "Away, but known.",
  // iOS Safari auto-links anything that looks like an address or phone number
  // ("data detectors"), styling it as a blue underlined link and sending taps
  // to directions. That's why the vet address appeared underlined on mobile
  // but not desktop, and why tapping it behaved differently from every other
  // map link here — none of which came from our markup.
  //
  // Turned off so links are only ever the ones we wrote: the clinic name goes
  // to Maps (its query already includes the address), and explicit tel: links
  // still dial. Applies to the recipient page, which is the surface sitters
  // actually read.
  formatDetection: { telephone: false, address: false, email: false, date: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${tanker.variable}`}>
      <body>{children}</body>
    </html>
  );
}
