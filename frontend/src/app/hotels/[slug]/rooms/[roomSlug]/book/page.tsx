import { notFound } from "next/navigation";
import BookingForm from "@/modules/hotel/components/BookingForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

async function getRoomDetails(hotelSlug: string, roomSlug: string) {
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

export default async function BookRoomPage({
  params,
}: {
  params: { slug: string; roomSlug: string };
}) {
  const data = await getRoomDetails(params.slug, params.roomSlug);
  if (!data) return notFound();

  const { hotel, room } = data;

  return (
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <h1>Book {room.name}</h1>
      <p style={{ color: "#666" }}>{hotel.name}</p>
      <BookingForm
        hotelId={hotel._id}
        roomId={room._id}
        basePrice={room.basePrice}
        maxOccupancy={room.maxOccupancy}
      />
    </main>
  );
}
