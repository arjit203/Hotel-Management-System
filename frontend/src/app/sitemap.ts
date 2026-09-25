import { MetadataRoute } from "next";
import { getTheHotel } from "@/lib/hotel";
import { getSettings, publishedLegalPages } from "@/lib/settings";
import { siteUrl, isIndexable } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  // Indexing switched off in Settings → SEO: advertise nothing.
  if (!isIndexable(settings)) return [];

  const SITE_URL = siteUrl(settings);

  const staticRoutes = [
    "",
    "/hotel",
    "/hotel/about",
    "/hotel/rooms",
    "/hotel/gallery",
    "/hotel/offers",
    "/hotel/amenities",
    "/hotel/reviews",
    "/hotel/faqs",
    "/hotel/contact",
    "/hotel/booking",
    "/restaurant",
    "/restaurant/menu",
    "/restaurant/dining",
    "/restaurant/offers",
    "/restaurant/gallery",
    "/restaurant/reviews",
    "/restaurant/faqs",
    "/restaurant/contact",
    "/restaurant/reserve",
    "/marriage-hall",
    "/marriage-hall/gallery",
    "/marriage-hall/packages",
    "/marriage-hall/decorations",
    "/marriage-hall/catering",
    "/marriage-hall/availability",
    "/marriage-hall/reviews",
    "/marriage-hall/contact",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const data = await getTheHotel();
  const roomRoutes = (data?.rooms || []).map((room) => ({
    url: `${SITE_URL}/hotel/rooms/${room.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Only policies that have been written — an unpublished one 404s.
  const legalRoutes = publishedLegalPages(settings).map((page) => ({
    url: `${SITE_URL}/legal/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...staticRoutes, ...roomRoutes, ...legalRoutes];
}
