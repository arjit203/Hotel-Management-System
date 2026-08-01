import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import BookingForm from "@/modules/hotel/components/BookingForm";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Book Your Stay",
  description: "Book your room at 7 Vachan — select dates, rooms, and complete your reservation.",
  alternates: { canonical: "/hotel/booking" },
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams: { room?: string };
}) {
  const data = await getTheHotel();
  if (!data || data.rooms.length === 0) return notFound();

  // Pre-select the room passed via ?room=<slug> (e.g. from a Room Details
  // page's "Book Now" link); default to the first room if none/invalid.
  const preselected = data.rooms.find((r) => r.slug === searchParams.room) || data.rooms[0];

  return (
    <main className="mx-auto max-w-3xl px-5 sm:px-8 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Booking" }]} />
      <div className="text-center mb-10">
        <p className="section-eyebrow justify-center flex">Reserve Your Stay</p>
        <h1 className="section-title">Book Your Stay</h1>
        <p className="text-ink/60 mt-3">{data.hotel.name}</p>
      </div>
      <div className="flex justify-center">
        <BookingForm hotelId={data.hotel._id} room={preselected} allRooms={data.rooms} />
      </div>
    </main>
  );
}
