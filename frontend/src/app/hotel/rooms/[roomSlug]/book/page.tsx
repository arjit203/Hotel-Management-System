import { notFound } from "next/navigation";
import BookingForm from "@/modules/hotel/components/BookingForm";
import { getTheHotelRoom } from "@/lib/hotel";

export default async function BookRoomPage({ params }: { params: { roomSlug: string } }) {
  const data = await getTheHotelRoom(params.roomSlug);
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
