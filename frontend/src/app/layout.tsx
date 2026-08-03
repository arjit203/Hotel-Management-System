import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { getSettings, str, flag } from "@/lib/settings";
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

/**
 * Site-wide metadata, driven by Settings → SEO.
 *
 * A function rather than a constant so the values can be read from the database
 * — Next calls `generateMetadata` per request on a dynamic route and caches it
 * alongside the page otherwise, which is the same freshness the pages
 * themselves get.
 *
 * Every field falls back to the string this file previously hardcoded, so an
 * install that never opens Settings emits exactly the metadata it did before.
 * The one addition is `robots`, which is only ever set to `noindex` when a
 * Super Admin has explicitly turned indexing off — the default stays "index",
 * because silently de-indexing a live site would be catastrophic and
 * invisible.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  const siteName = str(settings, "general", "siteName", "7 Vachan");
  const canonical = str(settings, "seo", "canonicalUrl", SITE_URL);
  const indexable = flag(settings, "seo", "robotsIndex", true);
  const ogImage = str(settings, "branding", "ogImageUrl");
  const verification = str(settings, "seo", "googleSiteVerification");

  return {
    metadataBase: new URL(canonical || SITE_URL),
    title: {
      default: str(settings, "seo", "defaultTitle", "7 Vachan — Luxury Hotel & Stays"),
      template: str(settings, "seo", "titleTemplate", "%s | 7 Vachan"),
    },
    description: str(
      settings,
      "seo",
      "defaultDescription",
      "7 Vachan Grand — a premium hotel experience with luxury rooms, fine dining, and warm hospitality in Satna."
    ),
    keywords: str(settings, "seo", "keywords") || undefined,
    openGraph: {
      siteName,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
    ...(verification ? { verification: { google: verification } } : {}),
    ...(str(settings, "branding", "faviconUrl")
      ? { icons: { icon: str(settings, "branding", "faviconUrl") } }
      : {}),
  };
}

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
