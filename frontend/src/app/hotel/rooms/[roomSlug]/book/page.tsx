import { notFound } from "next/navigation";
// import Script from "next/script";
import BookingForm from "@/modules/hotel/components/BookingForm";
import { getTheHotelRoom, getTheHotel } from "@/lib/hotel";

export default async function BookRoomPage({ params }: { params: { roomSlug: string } }) {
  const data = await getTheHotelRoom(params.roomSlug);
  if (!data) return notFound();

  const { hotel, room } = data;

  // Feature 4: the guest can add other room categories from this same hotel
  // to the same booking (e.g. 2 Deluxe + 1 Suite) — fetch the full list here
  // so BookingForm can offer them, reusing getTheHotel rather than a new fetch.
  const fullHotel = await getTheHotel();
  const allRooms = fullHotel?.rooms || [room];

  return (
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      {/* <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" /> */}
      <h1>Book {room.name}</h1>
      <p style={{ color: "#666" }}>{hotel.name}</p>
      <BookingForm hotelId={hotel._id} room={room} allRooms={allRooms} />
    </main>
  );
}
