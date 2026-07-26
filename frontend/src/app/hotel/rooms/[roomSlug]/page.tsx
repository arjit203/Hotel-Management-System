import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid";
import { getTheHotelRoom } from "@/lib/hotel";

export async function generateMetadata({
  params,
}: {
  params: { roomSlug: string };
}): Promise<Metadata> {
  const data = await getTheHotelRoom(params.roomSlug);
  if (!data) return {};

  return {
    title: data.room.metaTitle || `${data.room.name} — ${data.hotel.name}`,
    description: data.room.metaDescription || data.room.description.slice(0, 155),
  };
}

export default async function RoomDetailsPage({ params }: { params: { roomSlug: string } }) {
  const data = await getTheHotelRoom(params.roomSlug);
  if (!data) return notFound();

  const { hotel, room } = data;

  return (
    <main style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <p>
        <Link href="/hotel">← Back to {hotel.name}</Link>
      </p>
      <span style={{ fontSize: 13, textTransform: "uppercase", color: "#888" }}>
        {room.categoryName}
      </span>
      <h1 style={{ marginTop: 4 }}>{room.name}</h1>

      {room.images.length > 0 && (
        <div style={{ margin: "16px 0" }}>
          <GalleryGrid images={room.images.map((url: string, i: number) => ({ _id: String(i), imageUrl: url }))} />
        </div>
      )}

      <p>{room.description}</p>
      <p>Max occupancy: {room.maxOccupancy} guests</p>

      <h3>Amenities</h3>
      <ul>
        {room.amenities.map((a: string) => (
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
          href={`/hotel/rooms/${room.slug}/book`}
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
