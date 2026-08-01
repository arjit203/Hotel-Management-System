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
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

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
  // hotel's overall reviews (this data model doesn't support per-room reviews —
  // see PROJECT_DOCUMENTATION.md open item), shown as a teaser with a link to
  // the full Reviews page rather than fabricating room-level data.
  const fullHotel = await getTheHotel();
  const relatedRooms = (fullHotel?.rooms || []).filter((r) => r.slug !== room.slug).slice(0, 3);
  const reviews = (fullHotel?.reviews || []).slice(0, 2);

  return (
    <main>
      {/* Schema only — the "All Rooms" link below is the visible affordance,
          which is more useful than a full trail on a leaf page. */}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Rooms", href: "/hotel/rooms" },
          { label: room.name },
        ]}
      />

      <div className="container-luxe pb-24 pt-12 sm:pt-16">
        <Link
          href="/hotel/rooms"
          className="group mb-10 inline-flex items-center gap-2 text-[10px] uppercase tracking-luxe text-warm-500 transition-colors hover:text-gold"
        >
          <ArrowLeft
            size={13}
            className="transition-transform duration-400 ease-luxe group-hover:-translate-x-1"
          />
          All Rooms
        </Link>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          {/* ── Imagery ── */}
          <div className="lg:col-span-7">
            <Reveal duration={0.85} scale>
              <RoomImageGallery images={room.images} roomName={room.name} />
            </Reveal>
          </div>

          {/* ── Details ──
              Sticky on desktop so the rate and the Book action stay in reach
              while the guest reads down the page. */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <Reveal direction="left">
                <p className="text-[10px] uppercase tracking-eyebrow text-gold">{room.categoryName}</p>

                <TextReveal
                  as="h1"
                  text={room.name}
                  className="page-title mt-3 !text-display-sm"
                  delay={0.05}
                />

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <StarRating rating={hotel.starRating} size={13} />
                  <span className="text-[10px] uppercase tracking-luxe text-warm-400">{hotel.name}</span>
                </div>

                <div className="rule-fade my-7" />

                <p className="lead">{room.description}</p>

                <p className="mt-6 flex items-center gap-2 text-xs uppercase tracking-luxe text-warm-500">
                  <Users size={14} className="text-gold" /> Sleeps up to {room.maxOccupancy}
                </p>

                {room.amenities?.length > 0 && (
                  <div className="mt-9">
                    <p className="mb-4 text-[10px] uppercase tracking-eyebrow text-warm-400">
                      In This Room
                    </p>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                      {room.amenities.map((a: string) => {
                        const Icon = getAmenityIcon(a);
                        return (
                          <div key={a} className="flex items-center gap-2.5 text-sm font-light text-ink/75">
                            <Icon size={15} strokeWidth={1.5} className="shrink-0 text-gold" /> {a}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Rate + primary action ── */}
                <div className="mt-9 rounded-luxe border border-ink/[0.07] bg-white p-7 shadow-luxury">
                  <div className="flex items-end justify-between gap-4">
                    <p className="leading-none">
                      <span className="mb-2 block text-[9px] uppercase tracking-eyebrow text-warm-400">
                        Rate From
                      </span>
                      <span className="price text-4xl">₹{room.basePrice.toLocaleString("en-IN")}</span>
                      <span className="ml-1.5 text-xs font-light text-warm-500">/ night</span>
                    </p>
                  </div>
                  <Link
                    href={`/hotel/booking?room=${room.slug}`}
                    className="btn-primary group mt-6 w-full"
                  >
                    Book This Room <ArrowRight size={14} className="btn-arrow" />
                  </Link>
                  <p className="mt-4 text-center text-[10px] uppercase tracking-luxe text-warm-400">
                    Instant confirmation
                  </p>
                </div>

                <RoomAvailabilityCheck roomId={room._id} />
              </Reveal>
            </div>
          </div>
        </div>

        {/* ── Reviews teaser ── */}
        {reviews.length > 0 && (
          <section className="mt-24">
            <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="section-eyebrow">Guest Stories</p>
                <TextReveal as="h2" text="What guests say" className="section-title" delay={0.05} />
              </div>
              <Link href="/hotel/reviews" className="link-arrow">
                All reviews <ArrowRight size={14} />
              </Link>
            </div>

            <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {reviews.map((r) => (
                <StaggerItem key={r._id} className="flex">
                  <figure className="card-luxe card-hover flex w-full flex-col p-8">
                    <StarRating rating={r.rating} size={13} />
                    <blockquote className="mt-5 flex-1">
                      <p className="font-display text-lg font-light leading-relaxed text-ink/80">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    </blockquote>
                    <figcaption className="mt-6 text-[11px] font-medium uppercase tracking-luxe text-ink/60">
                      {r.guestName || "Guest"}
                    </figcaption>
                  </figure>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {/* ── Related rooms ── */}
        {relatedRooms.length > 0 && (
          <section className="mt-24">
            <div className="mb-10">
              <p className="section-eyebrow">Also Available</p>
              <TextReveal as="h2" text="You may also like" className="section-title" delay={0.05} />
            </div>
            <Stagger className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {relatedRooms.map((r) => (
                <StaggerItem key={r._id} className="flex">
                  <RoomCard room={r} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </main>
  );
}
