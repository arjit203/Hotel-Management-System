import { MetadataRoute } from "next";
import { getTheHotel } from "@/lib/hotel";

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

  return [...staticRoutes, ...roomRoutes];
}
