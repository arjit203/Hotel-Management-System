import { MetadataRoute } from "next";
import { getTheHotel } from "@/lib/hotel";
import { getTheRestaurant } from "@/lib/restaurant";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Touch the restaurant fetch so a missing/unreachable restaurant simply omits
  // nothing extra rather than breaking sitemap generation.
  await getTheRestaurant();

  return [...staticRoutes, ...roomRoutes];
}
