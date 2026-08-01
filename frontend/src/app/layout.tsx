import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/motion/ScrollProgress";
import PageTransition from "@/components/motion/PageTransition";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Typography pairing: a high-contrast luxury serif for display type against a
 * geometric sans for body/UI — the standard vocabulary of high-end hospitality.
 *
 * These use next/font/google, which downloads and SELF-HOSTS the font files at
 * build time and emits a preload + size-adjusted fallback. So there is no
 * runtime dependency on fonts.googleapis.com and no layout shift — which was the
 * actual concern behind the earlier system-font-stack decision (see CHANGELOG
 * 2026-08-01). `display: "swap"` keeps text visible throughout the font load.
 */
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const sans = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "7 Vachan — Luxury Hotel & Stays",
    template: "%s | 7 Vachan",
  },
  description:
    "7 Vachan Grand — a premium hotel experience with luxury rooms, fine dining, and warm hospitality in Satna.",
  openGraph: {
    siteName: "7 Vachan",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-cream font-sans font-light text-ink antialiased">
        <ScrollProgress />
        <Header />
        {/* Route-change entrance animation. Header/Footer sit outside it so they
            stay visually anchored while the page content transitions. */}
        <PageTransition>{children}</PageTransition>
        <Footer />
      </body>
    </html>
  );
}
