import { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";
import { siteUrl, isIndexable } from "@/lib/seo";

/** Private or per-guest pages: never useful in a search result. */
const PRIVATE_PATHS = [
  "/login",
  "/signup",
  "/reset-password",
  "/my-bookings",
  "/verify-email",
  "/hotel/booking/confirmation",
  "/booking-confirmation",
  "/restaurant/reserve/confirmation",
  "/marriage-hall/enquiry",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const site = siteUrl(settings);

  // Settings → SEO → "allow indexing" off (e.g. a staging copy): block everything.
  if (!isIndexable(settings)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
