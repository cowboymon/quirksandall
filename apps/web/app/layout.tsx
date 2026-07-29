import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
