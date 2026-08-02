const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * schema.org `Restaurant` JSON-LD. Deliberately parallel to HotelSchema — same
 * shape, same single-script output — so both verticals emit structured data the
 * same way (AI_INSTRUCTIONS.md §9 requires it on relevant pages).
 *
 * `openingHoursSpecification` and `servesCuisine` are the two fields Google
 * actually surfaces for restaurants, so they're worth mapping properly rather
 * than emitting a generic LocalBusiness.
 */
const DAY_URIS = [
  "https://schema.org/Sunday",
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
];

export default function RestaurantSchema({
  restaurant,
  image,
  reviewSummary,
}: {
  restaurant: {
    name: string;
    description: string;
    address: string;
    contactPhone: string;
    cuisineTypes: string[];
    averageCostForTwo?: number;
    serviceHours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[];
  };
  image?: string;
  reviewSummary?: { average: number; count: number };
}) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.description,
    address: restaurant.address,
    telephone: restaurant.contactPhone,
    url: `${SITE_URL}/restaurant`,
    image,
    menu: `${SITE_URL}/restaurant/menu`,
    acceptsReservations: true,
  };

  if (restaurant.cuisineTypes.length) jsonLd.servesCuisine = restaurant.cuisineTypes;

  if (restaurant.averageCostForTwo) {
    // priceRange is a free-text hint; a cost-for-two figure is the local convention.
    jsonLd.priceRange = `₹${restaurant.averageCostForTwo} for two`;
  }

  const openDays = restaurant.serviceHours.filter((h) => !h.isClosed);
  if (openDays.length) {
    jsonLd.openingHoursSpecification = openDays.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_URIS[h.dayOfWeek],
      opens: h.openTime,
      closes: h.closeTime,
    }));
  }

  // Only emit a rating when one genuinely exists — an aggregateRating of 0 from
  // 0 reviews is a structured-data error, not a neutral default.
  if (reviewSummary && reviewSummary.count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewSummary.average,
      reviewCount: reviewSummary.count,
    };
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
