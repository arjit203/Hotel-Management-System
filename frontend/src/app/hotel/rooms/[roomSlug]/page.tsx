import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, ArrowRight, ArrowLeft } from "lucide-react";
import { getAmenityIcon } from "@/lib/amenityIcons";
import { getTheHotelRoom, getTheHotel } from "@/lib/hotel";
import RoomImageGallery from "@/modules/hotel/components/RoomImageGallery";
import RoomAvailabilityCheck from "@/modules/hotel/components/RoomAvailabilityCheck";
import RoomCard from "@/modules/hotel/components/RoomCard";
import StarRating from "@/components/StarRating";
import Breadcrumbs from "@/components/Breadcrumbs";

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
    alternates: { canonical: `/hotel/rooms/${params.roomSlug}` },
    openGraph: {
      images: data.room.images?.[0] ? [data.room.images[0]] : undefined,
    },
  };
}

export default async function RoomDetailsPage({ params }: { params: { roomSlug: string } }) {
  const data = await getTheHotelRoom(params.roomSlug);
  if (!data) return notFound();

  const { hotel, room } = data;

  // Related rooms + hotel-wide reviews teaser — reuses the same getTheHotel()
  // call already used elsewhere (no new API dependency). Reviews here are the
  // hotel's overall reviews (this data model doesn't support per-room
  // reviews — see PROJECT_DOCUMENTATION.md open item), shown as a teaser
  // with a link to the full Reviews page rather than fabricating room-level data.
  const fullHotel = await getTheHotel();
  const relatedRooms = (fullHotel?.rooms || []).filter((r) => r.slug !== room.slug).slice(0, 3);
  const reviews = (fullHotel?.reviews || []).slice(0, 2);

  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Rooms", href: "/hotel/rooms" },
          { label: room.name },
        ]}
      />
      <Link href="/hotel/rooms" className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-gold mb-6 mt-4">
        <ArrowLeft size={15} /> Back to Rooms
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <RoomImageGallery images={room.images} roomName={room.name} />

        <div>
          <span className="text-xs uppercase tracking-widest text-gold font-semibold">{room.categoryName}</span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink mt-2">{room.name}</h1>
          <p className="text-ink/50 text-sm mt-1">{hotel.name}</p>

          <p className="text-ink/70 leading-relaxed mt-5">{room.description}</p>

          <div className="flex items-center gap-2 mt-5 text-ink/70">
            <Users size={17} className="text-gold" /> Up to {room.maxOccupancy} guests
          </div>

          {room.amenities?.length > 0 && (
            <div className="mt-7">
              <h3 className="font-display text-lg text-ink mb-3">Room Amenities</h3>
              <div className="grid grid-cols-2 gap-3">
                {room.amenities.map((a: string) => {
                  const Icon = getAmenityIcon(a);
                  return (
                    <div key={a} className="flex items-center gap-2 text-sm text-ink/70">
                      <Icon size={16} className="text-gold shrink-0" /> {a}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-8 border-t border-ink/10">
            <div>
              <span className="font-display text-3xl text-ink">₹{room.basePrice}</span>
              <span className="text-ink/50 text-sm"> /night</span>
            </div>
            <Link href={`/hotel/booking?room=${room.slug}`} className="btn-primary">
              Book Now <ArrowRight size={16} />
            </Link>
          </div>

          <RoomAvailabilityCheck roomId={room._id} />
        </div>
      </div>

      {reviews.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl text-ink mb-6">Guest Reviews</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {reviews.map((r) => (
              <div key={r._id} className="bg-white rounded-2xl p-6 border border-ink/5 shadow-luxury">
                <StarRating rating={r.rating} size={14} />
                <p className="text-ink/70 text-sm mt-3">{r.comment}</p>
                <p className="text-sm font-semibold text-ink mt-3">{r.guestName || "Guest"}</p>
              </div>
            ))}
          </div>
          <Link href="/hotel/reviews" className="inline-flex items-center gap-1.5 text-gold text-sm font-semibold mt-5 hover:gap-2.5 transition-all">
            View All Reviews <ArrowRight size={15} />
          </Link>
        </section>
      )}

      {relatedRooms.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl text-ink mb-6">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedRooms.map((r) => (
              <RoomCard key={r._id} room={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
