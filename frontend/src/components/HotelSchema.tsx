import { getSiteUrl, jsonLdString } from "@/lib/seo";

export default async function HotelSchema({
  hotel,
  image,
  reviewSummary,
}: {
  hotel: {
    name: string;
    description: string;
    address: string;
    contactPhone: string;
    starRating: number;
  };
  image?: string;
  reviewSummary?: { average: number; count: number };
}) {
  const site = await getSiteUrl();

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    description: hotel.description,
    address: hotel.address,
    telephone: hotel.contactPhone,
    url: `${site}/hotel`,
    ...(image ? { image } : {}),
  };

  // A star rating of 0 means "not classified", not "zero stars" — omit it.
  if (hotel.starRating > 0) {
    jsonLd.starRating = { "@type": "Rating", ratingValue: hotel.starRating };
  }

  // Only emit a rating when there are real approved reviews behind it.
  if (reviewSummary && reviewSummary.count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewSummary.average,
      reviewCount: reviewSummary.count,
    };
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />;
}
