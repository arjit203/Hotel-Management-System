const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function HotelSchema({
  hotel,
  image,
}: {
  hotel: {
    name: string;
    description: string;
    address: string;
    contactPhone: string;
    starRating: number;
  };
  image?: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    description: hotel.description,
    address: hotel.address,
    telephone: hotel.contactPhone,
    starRating: { "@type": "Rating", ratingValue: hotel.starRating },
    url: SITE_URL,
    image,
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
