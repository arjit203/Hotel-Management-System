import Link from "next/link";
import StarRating from "@/components/StarRating";

export interface HotelSummary {
  _id: string;
  slug: string;
  name: string;
  description: string;
  starRating: number;
  address: string;
}

export default function HotelCard({ hotel }: { hotel: HotelSummary }) {
  return (
    <Link
      href={`/hotels/${hotel.slug}`}
      style={{
        display: "block",
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: 20,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <h3 style={{ margin: "0 0 8px" }}>{hotel.name}</h3>
      <StarRating rating={hotel.starRating} />
      <p style={{ color: "#666", margin: "8px 0" }}>{hotel.address}</p>
      <p style={{ color: "#444" }}>{hotel.description.slice(0, 120)}...</p>
    </Link>
  );
}
