import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import RoomSearch from "@/modules/hotel/components/RoomSearch";
import PageHeader from "@/components/PageHeader";
import { BedDouble } from "lucide-react";
import PropertyUnavailable from "@/components/PropertyUnavailable";

export const metadata: Metadata = {
  title: "Rooms & Suites",
  description:
    "Explore our range of luxury rooms and suites — filter by dates, guests, price, and amenities.",
  alternates: { canonical: "/hotel/rooms" },
};

export default async function RoomsListingPage() {
  const data = await getTheHotel();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/hotel/rooms"
        icon={BedDouble}
      />
    );
  }

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Accommodation"
          title="Rooms & Suites"
          lead="Find the room that suits the occasion — filter by dates, guests, budget, and category."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Hotel", href: "/hotel" },
            { label: "Rooms & Suites" },
          ]}
        />
        <RoomSearch hotelSlug={data.hotel.slug} initialRooms={data.rooms} />
      </div>
    </main>
  );
}
