import Link from "next/link";

export interface RoomSummary {
  _id: string;
  slug: string;
  categoryName: string;
  name: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  images: string[];
}

export default function RoomCard({
  hotelSlug,
  room,
}: {
  hotelSlug: string;
  room: RoomSummary;
}) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
      {room.images?.[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={room.images[0]}
          alt={room.name}
          style={{ width: "100%", height: 180, objectFit: "cover" }}
        />
      )}
      <div style={{ padding: 16 }}>
        <span
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            color: "#888",
            letterSpacing: 0.5,
          }}
        >
          {room.categoryName}
        </span>
        <h4 style={{ margin: "4px 0" }}>{room.name}</h4>
        <p style={{ color: "#666", fontSize: 14 }}>{room.description.slice(0, 90)}...</p>
        <p style={{ margin: "8px 0", fontSize: 14 }}>Up to {room.maxOccupancy} guests</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>₹{room.basePrice} / night</strong>
          <Link
            href={`/hotels/${hotelSlug}/rooms/${room.slug}`}
            style={{
              background: "#111",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
