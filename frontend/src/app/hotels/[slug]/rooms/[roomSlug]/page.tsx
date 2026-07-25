import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

interface RoomDetailsData {
  hotel: { _id: string; name: string; slug: string };
  room: {
    _id: string;
    name: string;
    slug: string;
    categoryName: string;
    description: string;
    images: string[];
    basePrice: number;
    maxOccupancy: number;
    amenities: string[];
    metaTitle?: string;
    metaDescription?: string;
  };
}

async function getRoomDetails(hotelSlug: string, roomSlug: string): Promise<RoomDetailsData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/hotels/${hotelSlug}/rooms/${roomSlug}`, {
      cache: "no-store",
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; roomSlug: string };
}): Promise<Metadata> {
  const data = await getRoomDetails(params.slug, params.roomSlug);
  if (!data) return {};

  return {
    title: data.room.metaTitle || `${data.room.name} — ${data.hotel.name}`,
    description: data.room.metaDescription || data.room.description.slice(0, 155),
  };
}

export default async function RoomDetailsPage({
  params,
}: {
  params: { slug: string; roomSlug: string };
}) {
  const data = await getRoomDetails(params.slug, params.roomSlug);
  if (!data) return notFound();

  const { hotel, room } = data;

  return (
    <main style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <p>
        <Link href={`/hotels/${hotel.slug}`}>← Back to {hotel.name}</Link>
      </p>
      <span style={{ fontSize: 13, textTransform: "uppercase", color: "#888" }}>
        {room.categoryName}
      </span>
      <h1 style={{ marginTop: 4 }}>{room.name}</h1>

      {room.images.length > 0 && (
        <div style={{ margin: "16px 0" }}>
          <GalleryGrid images={room.images.map((url, i) => ({ _id: String(i), imageUrl: url }))} />
        </div>
      )}

      <p>{room.description}</p>
      <p>Max occupancy: {room.maxOccupancy} guests</p>

      <h3>Amenities</h3>
      <ul>
        {room.amenities.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "24px 0",
        }}
      >
        <strong style={{ fontSize: 24 }}>₹{room.basePrice} / night</strong>
        <Link
          href={`/hotels/${hotel.slug}/rooms/${room.slug}/book`}
          style={{
            background: "#111",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Book Now
        </Link>
      </div>
    </main>
  );
}
