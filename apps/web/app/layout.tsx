import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quirks & All",
  description: "Away, but known.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
