const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * JSON-LD for the Marriage Hall.
 *
 * Typed as `EventVenue` rather than `Hotel` or `Restaurant` — that is the
 * schema.org type search engines map to a banquet/wedding venue, and it is what
 * surfaces the capacity and address in a venue result.
 *
 * Deliberately carries no `priceRange` or `offers`: the venue has not published
 * pricing, and emitting a made-up range would be structured-data misinformation.
 */
export default function HallSchema({
  hall,
  image,
  reviewSummary,
}: {
  hall: {
    name: string;
    description: string;
    address: string;
    contactPhone: string;
    contactEmail?: string;
    floatingCapacity: number;
  };
  image?: string;
  reviewSummary?: { average: number; count: number };
}) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: hall.name,
    description: hall.description,
    address: hall.address,
    telephone: hall.contactPhone,
    url: `${SITE_URL}/marriage-hall`,
    maximumAttendeeCapacity: hall.floatingCapacity,
    ...(hall.contactEmail ? { email: hall.contactEmail } : {}),
    ...(image ? { image } : {}),
  };

  // Only emit a rating when there are real approved reviews behind it.
  if (reviewSummary && reviewSummary.count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewSummary.average,
      reviewCount: reviewSummary.count,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
