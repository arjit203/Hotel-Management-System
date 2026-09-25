import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RoomCard, { RoomSummary } from "@/modules/hotel/components/RoomCard";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

export default function FeaturedRooms({
  rooms,
  tone = "cream",
}: {
  rooms: RoomSummary[];
  /** Section surface; pages alternate it so neighbouring sections stay distinct. */
  tone?: "cream" | "sand";
}) {
  if (rooms.length === 0) return null;

  return (
    <section className={`section ${tone === "sand" ? "bg-cream-dark" : ""}`}>
      <div className="container-luxe">
      {/* Asymmetric header: title left, supporting copy + link right. Centring
          every heading is what makes a page feel like a template. */}
      <div className="mb-8 grid grid-cols-1 items-end gap-6 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <Reveal duration={0.6}>
            <p className="section-eyebrow">Accommodation</p>
          </Reveal>
          <TextReveal as="h2" text="Rooms & Suites" className="section-title" delay={0.05} />
        </div>

        <div className="lg:col-span-5">
          <Reveal delay={0.15} distance={18}>
            <p className="lead">
              Thoughtfully composed spaces where natural light, considered materials and quiet
              detail come together.
            </p>
            <Link href="/hotel/rooms" className="link-arrow mt-6">
              View all rooms <ArrowRight size={14} />
            </Link>
          </Reveal>
        </div>
      </div>

      <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.slice(0, 3).map((room, i) => (
          <StaggerItem key={room._id} className="flex">
            <RoomCard room={room} priority={i === 0} />
          </StaggerItem>
        ))}
      </Stagger>
      </div>
    </section>
  );
}
