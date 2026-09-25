import { getSettings, str, flag, type PublicSettings } from "./settings";

/**
 * Shared SEO helpers — one place for the site's absolute URL, the default
 * OpenGraph block and safe JSON-LD serialisation.
 *
 * Before this, six files each carried their own
 * `process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"` — the wrong
 * port (dev runs on 3100), and none of them honoured Settings → SEO →
 * canonical URL, so the sitemap, robots.txt and structured data could point at
 * a different origin than the page's own canonical tag.
 */

const DEV_FALLBACK = "http://localhost:3100";

/** Frontend SEO fallbacks — kept word-for-word equal to the backend's SETTING_DEFAULTS.seo. */
export const DEFAULT_TITLE = "7 Vachan — Hotel, Restaurant & Banquets";
export const DEFAULT_TITLE_TEMPLATE = "%s · 7 Vachan";
export const DEFAULT_DESCRIPTION =
  "Stay, dine and celebrate on one estate. Rooms, a full-service restaurant and a banquet hall under one roof.";

/** A value is usable as an origin only if it parses as an absolute http(s) URL. */
function validOrigin(value: string | undefined): string | null {
  if (!value || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // Strip any trailing slash so `${site}/path` never doubles it.
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/**
 * The site's absolute origin, from already-loaded settings.
 * Order: Settings → SEO → canonical URL (if a valid URL) → NEXT_PUBLIC_SITE_URL
 * → http://localhost:3100.
 */
export function siteUrl(settings?: PublicSettings): string {
  return (
    validOrigin(settings ? str(settings, "seo", "canonicalUrl") : undefined) ||
    validOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    DEV_FALLBACK
  );
}

/** Same as `siteUrl()`, loading settings itself (shared per request via `cache()`). */
export async function getSiteUrl(): Promise<string> {
  return siteUrl(await getSettings());
}

/** Whether a Super Admin has left search indexing on (default: on). */
export function isIndexable(settings: PublicSettings): boolean {
  return flag(settings, "seo", "robotsIndex", true);
}

/**
 * The layout-level OpenGraph fields a page loses the moment it sets its own
 * `openGraph` (Next replaces the object, it does not merge it). Spread this in
 * first, then the page's own title/description/images.
 */
export async function ogDefaults(): Promise<{
  siteName: string;
  type: "website";
  images?: { url: string }[];
}> {
  const settings = await getSettings();
  const ogImage = str(settings, "branding", "ogImageUrl");
  return {
    siteName: str(settings, "general", "siteName", "7 Vachan"),
    type: "website",
    ...(ogImage ? { images: [{ url: ogImage }] } : {}),
  };
}

/**
 * JSON for a `<script type="application/ld+json">`. Escaping `<` stops an
 * admin-entered string such as `</script><script>…` from closing the tag.
 */
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
