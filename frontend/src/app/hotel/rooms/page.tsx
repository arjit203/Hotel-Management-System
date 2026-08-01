import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import RoomSearch from "@/modules/hotel/components/RoomSearch";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Rooms & Suites",
  description: "Explore our range of luxury rooms and suites — filter by dates, guests, price, and amenities.",
  alternates: { canonical: "/hotel/rooms" },
};

export default async function RoomsListingPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Rooms & Suites" }]} />
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Accommodation</p>
        <h1 className="section-title">Rooms &amp; Suites</h1>
        <p className="text-ink/60 mt-4">
          Find the perfect room for your stay — filter by dates, guests, budget, and room type.
        </p>
      </div>
      <RoomSearch hotelSlug={data.hotel.slug} initialRooms={data.rooms} />
    </main>
  );
}
