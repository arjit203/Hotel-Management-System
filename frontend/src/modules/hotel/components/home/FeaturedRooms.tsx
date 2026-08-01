import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RoomCard, { RoomSummary } from "@/modules/hotel/components/RoomCard";

export default function FeaturedRooms({ rooms }: { rooms: RoomSummary[] }) {
  if (rooms.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Accommodation</p>
        <h2 className="section-title">Featured Rooms &amp; Suites</h2>
        <p className="text-ink/60 mt-4">
          Thoughtfully designed spaces that blend comfort with understated luxury.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {rooms.slice(0, 3).map((room) => (
          <RoomCard key={room._id} room={room} />
        ))}
      </div>

      <div className="text-center mt-12">
        <Link href="/hotel/rooms" className="btn-outline">
          View All Rooms <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
