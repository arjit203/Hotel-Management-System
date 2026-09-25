import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { getSettings, str, flag } from "@/lib/settings";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/motion/ScrollProgress";
import PageTransition from "@/components/motion/PageTransition";
import { siteUrl, DEFAULT_TITLE, DEFAULT_TITLE_TEMPLATE, DEFAULT_DESCRIPTION } from "@/lib/seo";

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
  const indexable = flag(settings, "seo", "robotsIndex", true);
  const ogImage = str(settings, "branding", "ogImageUrl");
  const verification = str(settings, "seo", "googleSiteVerification");

  // `siteUrl()` only ever returns a parseable absolute URL, but a throw here
  // would 500 every page on the site, so guard it regardless.
  let metadataBase: URL;
  try {
    metadataBase = new URL(siteUrl(settings));
  } catch {
    metadataBase = new URL("http://localhost:3100");
  }

  return {
    metadataBase,
    title: {
      default: str(settings, "seo", "defaultTitle", DEFAULT_TITLE),
      template: str(settings, "seo", "titleTemplate", DEFAULT_TITLE_TEMPLATE),
    },
    description: str(settings, "seo", "defaultDescription", DEFAULT_DESCRIPTION),
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

/**
 * Analytics ids are admin-entered strings interpolated into inline scripts, so
 * each is matched against its vendor's format first — anything else is ignored
 * rather than injected.
 */
const GA4_ID = /^G-[A-Z0-9]+$/;
const GTM_ID = /^GTM-[A-Z0-9]+$/;
const PIXEL_ID = /^\d+$/;

function validId(value: string, pattern: RegExp): string | null {
  const v = value.trim();
  return v && pattern.test(v) ? v : null;
}

async function Analytics() {
  const settings = await getSettings();
  const ga = validId(str(settings, "seo", "googleAnalyticsId"), GA4_ID);
  const gtm = validId(str(settings, "seo", "googleTagManagerId"), GTM_ID);
  const pixel = validId(str(settings, "seo", "facebookPixelId"), PIXEL_ID);

  return (
    <>
      {ga && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {gtm && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}
      {pixel && (
        <Script id="fb-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
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
        <Analytics />
      </body>
    </html>
  );
}
