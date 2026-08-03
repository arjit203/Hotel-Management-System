import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Clock,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Star,
} from "lucide-react";
import StarRating from "@/components/StarRating";
import { getTheHotel } from "@/lib/hotel";
import Hero from "@/components/sections/Hero";
import FeaturedRooms from "@/modules/hotel/components/home/FeaturedRooms";
import ValueProps, { HOTEL_VALUE_POINTS } from "@/components/sections/ValueProps";
import AmenitiesPreview from "@/components/sections/AmenitiesPreview";
import OffersPreview from "@/components/sections/OffersPreview";
import GalleryPreview from "@/components/sections/GalleryPreview";
import Breadcrumbs from "@/components/Breadcrumbs";
import HotelSchema from "@/components/HotelSchema";
import PropertyUnavailable from "@/components/PropertyUnavailable";
import Reveal from "@/components/motion/Reveal";
import Parallax from "@/components/motion/Parallax";
import TextReveal from "@/components/motion/TextReveal";
import LuxeImage from "@/components/motion/LuxeImage";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHotel();
  if (!data) return { title: "Hotel" };

  return {
    title: data.hotel.metaTitle || data.hotel.name,
    description: data.hotel.metaDescription || data.hotel.description.slice(0, 155),
    alternates: { canonical: "/hotel" },
    openGraph: {
      title: data.hotel.metaTitle || data.hotel.name,
      description: data.hotel.metaDescription || undefined,
      images: data.gallery?.[0]?.imageUrl ? [data.gallery[0].imageUrl] : undefined,
    },
  };
}

/**
 * The hotel's own landing page.
 *
 * Rebuilt to the same cinematic standard as the Marriage Hall: a full-screen
 * Ken Burns hero, counted stat tiles, a parallax editorial band and a closing
 * invitation — rather than the static scrim-over-a-still masthead it had.
 *
 * Every animation comes from the shared motion primitives (`Hero`, `Reveal`,
 * `Parallax`, `TextReveal`, `Stagger`, `AnimatedNumber`), so this page adds no
 * new motion vocabulary and inherits `prefers-reduced-motion` handling for free.
 *
 * A Server Component throughout — the motion wrappers are the client islands.
 * Never attach an event handler here; a stray one breaks every page in the app
 * (see CHANGELOG 2026-08-01).
 */
export default async function HotelPage() {
  const data = await getTheHotel();

  // Not `notFound()`. `getTheHotel()` returns null both when the hotel does not
  // exist and when the API is simply unreachable, and a 404 during a backend
  // restart tells guests the hotel is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        title="Our hotel details are loading"
        message="We can't reach our booking system this moment. It's usually brief — try again shortly, or call us and we'll take your booking directly."
        retryHref="/hotel"
        icon={BedDouble}
      />
    );
  }

  const { hotel, rooms, gallery, offers, reviews, reviewSummary } = data;

  // Hero backdrops: curated gallery photography first, room images as backfill.
  // De-duplicated so a repeated URL can't produce a "stuck" crossfade.
  const heroImages = Array.from(
    new Set([...gallery.map((g) => g.imageUrl), ...rooms.flatMap((r) => r.images || [])])
  ).slice(0, 6);

  // Pick images the hero isn't already leading with, so the bands below don't
  // echo the opening frame.
  const storyImage = gallery[2]?.imageUrl || rooms[0]?.images?.[0] || heroImages[0];
  const bandImage = gallery[5]?.imageUrl || gallery[1]?.imageUrl || heroImages[1];
  const closingImage = gallery[8]?.imageUrl || gallery[3]?.imageUrl || heroImages[2];

  const lowestRate = rooms.length
    ? Math.min(...rooms.map((r) => r.basePrice).filter((p) => typeof p === "number" && p > 0))
    : 0;

  return (
    <main>
      <HotelSchema hotel={hotel} image={gallery[0]?.imageUrl} />

      {/* Schema only — no visible trail. The hero already establishes place. */}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: hotel.name }]} />

      {/* ══ Cinematic hero ══ */}
      <Hero
        title={hotel.name}
        images={heroImages}
        eyebrow="7 Vachan Presents"
        tagline={
          hotel.metaDescription ||
          "Rooms that feel considered, service that remembers your name."
        }
        primaryCta={{ label: "Book Your Stay", href: "/hotel/booking" }}
        secondaryCta={{ label: "Explore Rooms", href: "/hotel/rooms" }}
      />

      {/* ══ Welcome ══ */}
      <section className="section bg-cream">
        <div className="container-luxe">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal duration={0.6}>
              <p className="section-eyebrow justify-center">The property</p>
            </Reveal>
            <TextReveal
              as="h2"
              text="A quiet kind of luxury"
              className="section-title"
              delay={0.05}
            />
            <Reveal delay={0.15}>
              <div className="mt-6 flex justify-center">
                <StarRating rating={hotel.starRating} size={17} />
              </div>
              <p className="lead mx-auto mt-6 max-w-prose">{hotel.description}</p>
              <p className="mt-6 flex items-center justify-center gap-2 text-[11px] uppercase tracking-luxe text-warm-400">
                <MapPin size={13} className="text-gold" />
                {hotel.address}
              </p>
            </Reveal>
          </div>

          {/* Counted stat tiles — the numbers animate once in view. */}
          <Stagger className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 sm:mt-20 lg:grid-cols-4">
            <StatTile
              value={rooms.length}
              label="Room types"
              icon={<BedDouble size={17} strokeWidth={1.5} />}
            />
            <StatTile
              value={hotel.amenities?.length || 0}
              label="Amenities"
              icon={<Sparkles size={17} strokeWidth={1.5} />}
            />
            <StatTile
              value={hotel.starRating}
              label="Star rating"
              icon={<Star size={17} strokeWidth={1.5} />}
            />
            {reviewSummary.count > 0 ? (
              <StatTile
                value={reviewSummary.count}
                label={reviewSummary.count === 1 ? "Guest review" : "Guest reviews"}
                icon={<Star size={17} strokeWidth={1.5} />}
              />
            ) : (
              <StatTile
                value={24}
                label="Hours reception"
                icon={<Clock size={17} strokeWidth={1.5} />}
              />
            )}
          </Stagger>
        </div>
      </section>

      {/* ══ Story band — parallax editorial ══ */}
      {storyImage && (
        <section className="section bg-cream-dark">
          <div className="container-luxe">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Parallax strength={8} className="overflow-hidden rounded-luxe shadow-luxury">
                <div className="aspect-[4/5]">
                  <LuxeImage
                    src={storyImage}
                    alt={`Inside ${hotel.name}`}
                    wrapperClassName="h-full"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </Parallax>

              <Reveal direction="left">
                <p className="section-eyebrow">Your stay</p>
                <h2 className="section-title !text-display-sm">
                  Arrive as a guest, leave as a regular
                </h2>
                <p className="lead mt-5">
                  Every room is prepared the same way whether you are staying one night or a
                  fortnight — pressed linen, quiet air conditioning, and a team that notices what
                  you asked for last time.
                </p>

                <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-6">
                  <Detail label="Check-in" value={hotel.checkInTime || "2:00 PM"} />
                  <Detail label="Check-out" value={hotel.checkOutTime || "11:00 AM"} />
                  {lowestRate > 0 && (
                    <Detail
                      label="Rooms from"
                      value={`₹${lowestRate.toLocaleString("en-IN")}`}
                      hint="per night"
                    />
                  )}
                  <Detail label="Reception" value="Open 24 hours" />
                </dl>

                <div className="mt-10 flex flex-wrap gap-4">
                  <Link href="/hotel/rooms" className="btn-primary group">
                    Explore rooms
                    <ArrowRight size={14} className="btn-arrow" />
                  </Link>
                  <Link href="/hotel/about" className="btn-outline group">
                    Our story
                    <ArrowRight size={14} className="btn-arrow" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      <FeaturedRooms rooms={rooms} />

      {/* ══ Full-bleed parallax band ══ */}
      {bandImage && (
        <section className="relative h-[52vh] min-h-[340px] overflow-hidden">
          <Parallax strength={12} className="absolute inset-0">
            <LuxeImage
              src={bandImage}
              alt=""
              wrapperClassName="h-full"
              sizes="100vw"
            />
          </Parallax>
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/45 to-ink/75"
          />
          <div className="container-luxe relative z-10 flex h-full items-center justify-center text-center">
            <Reveal>
              <p className="section-eyebrow justify-center !text-gold-light">Rest well</p>
              <p className="mx-auto max-w-2xl font-display text-[1.625rem] font-light leading-snug text-cream sm:text-[2.25rem]">
                The quietest rooms in Satna, and the only ones where breakfast waits for you
                rather than the other way round.
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* Hotel-specific promises. The home page runs ESTATE_VALUE_POINTS
          instead, which speak for all three businesses. */}
      <ValueProps points={HOTEL_VALUE_POINTS} />

      <AmenitiesPreview amenities={hotel.amenities} href="/hotel/amenities" />
      <OffersPreview offers={offers} viewAllHref="/hotel/offers" reserveHref="/hotel/booking" />
      <GalleryPreview images={gallery} href="/hotel/gallery" />

      {/* ══ Guest voice ══ */}
      {reviews.length > 0 && reviewSummary.count > 0 && (
        <section className="section-tight bg-ink">
          <div className="container-luxe">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <p className="section-eyebrow justify-center !text-gold-light">
                  {reviewSummary.average.toFixed(1)} from {reviewSummary.count}{" "}
                  {reviewSummary.count === 1 ? "guest" : "guests"}
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <blockquote className="font-display text-[1.5rem] font-light leading-relaxed text-cream sm:text-[1.875rem]">
                  &ldquo;{reviews[0].comment}&rdquo;
                </blockquote>
                <p className="mt-7 text-xs uppercase tracking-eyebrow text-cream/50">
                  {reviews[0].guestName || "A guest"}
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <Link href="/hotel/reviews" className="btn-ghost-light group mt-10">
                  Read every review
                  <ArrowRight size={14} className="btn-arrow" />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ══ Practical details ══ */}
      <section className="section-tight container-luxe">
        <Reveal>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-luxe border border-ink/[0.07] bg-ink/[0.06] sm:grid-cols-3">
            <a
              href={`tel:${hotel.contactPhone}`}
              className="group flex flex-col items-center gap-2 bg-white px-6 py-8 text-center transition-colors duration-500 hover:bg-cream"
            >
              <Phone size={16} strokeWidth={1.5} className="text-gold" />
              <span className="text-[9px] uppercase tracking-eyebrow text-warm-400">Call</span>
              <span className="text-sm font-light text-ink transition-colors group-hover:text-gold">
                {hotel.contactPhone}
              </span>
            </a>
            <a
              href={`mailto:${hotel.contactEmail}`}
              className="group flex flex-col items-center gap-2 bg-white px-6 py-8 text-center transition-colors duration-500 hover:bg-cream"
            >
              <Mail size={16} strokeWidth={1.5} className="text-gold" />
              <span className="text-[9px] uppercase tracking-eyebrow text-warm-400">Email</span>
              <span className="break-all text-sm font-light text-ink transition-colors group-hover:text-gold">
                {hotel.contactEmail}
              </span>
            </a>
            <div className="flex flex-col items-center gap-2 bg-white px-6 py-8 text-center">
              <Clock size={16} strokeWidth={1.5} className="text-gold" />
              <span className="text-[9px] uppercase tracking-eyebrow text-warm-400">Reception</span>
              <span className="text-sm font-light text-ink">Open 24 hours</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ Closing invitation ══ */}
      <section className="relative overflow-hidden bg-ink py-24 sm:py-32">
        {closingImage && (
          <>
            <div className="absolute inset-0 opacity-25">
              <LuxeImage src={closingImage} alt="" wrapperClassName="h-full" sizes="100vw" />
            </div>
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/60 to-ink/90"
            />
          </>
        )}

        <div className="container-luxe relative z-10 text-center">
          <Reveal>
            <p className="section-eyebrow justify-center !text-gold-light">Your room</p>
          </Reveal>
          <TextReveal as="h2" text="Stay with us" className="section-title !text-cream" />
          <Reveal delay={0.15}>
            <p className="lead mx-auto mt-6 max-w-xl !text-cream/70">
              Check availability for your dates. Only the advance is charged online — the rest is
              settled when you arrive.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/hotel/booking" className="btn-gold group">
                Book your stay
                <ArrowRight size={14} className="btn-arrow" />
              </Link>
              <a
                href={`tel:${hotel.contactPhone.replace(/\s/g, "")}`}
                className="btn-ghost-light group"
              >
                Call {hotel.contactPhone}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

/** Counting stat tile. Server-rendered; only the number animates. */
function StatTile({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <StaggerItem className="text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/[0.09] text-gold">
        {icon}
      </span>
      <p className="price text-display-sm">
        <AnimatedNumber value={value} />
      </p>
      <p className="meta mt-2">{label}</p>
    </StaggerItem>
  );
}

function Detail({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="meta">{label}</dt>
      <dd className="price mt-1 text-xl">
        {value}
        {hint && <span className="ml-1.5 text-xs font-light text-warm-400">{hint}</span>}
      </dd>
    </div>
  );
}
