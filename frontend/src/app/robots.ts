import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/signup", "/my-bookings", "/verify-email", "/hotel/booking/confirmation"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
