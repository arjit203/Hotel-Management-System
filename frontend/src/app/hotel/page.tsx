import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, MapPin, ArrowRight, Clock } from "lucide-react";
import StarRating from "@/components/StarRating";
import { getTheHotel } from "@/lib/hotel";
import FeaturedRooms from "@/modules/hotel/components/home/FeaturedRooms";
import AmenitiesPreview from "@/components/sections/AmenitiesPreview";
import OffersPreview from "@/components/sections/OffersPreview";
import GalleryPreview from "@/components/sections/GalleryPreview";
import Breadcrumbs from "@/components/Breadcrumbs";
import HotelSchema from "@/components/HotelSchema";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHotel();
  if (!data) return {};

  return {
    title: data.hotel.metaTitle || data.hotel.name,
    description: data.hotel.metaDescription || data.hotel.description.slice(0, 155),
    alternates: { canonical: "/hotel" },
  };
}

export default async function HotelPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  const { hotel, rooms, gallery, offers } = data;
  const bannerImage = gallery[0]?.imageUrl || rooms[0]?.images?.[0];

  return (
    <main>
      <HotelSchema hotel={hotel} image={gallery[0]?.imageUrl} />

      {/* ── Masthead: photography behind a deep scrim ── */}
      <section className="relative overflow-hidden bg-ink">
        {bannerImage && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: `url(${cldImage(bannerImage, { width: IMAGE_WIDTHS.hero })})` }}
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink" />

        <div className="container-luxe relative py-24 text-center sm:py-28 lg:py-32">
          <Reveal duration={0.6}>
            <p className="section-eyebrow flex justify-center">7 Vachan Presents</p>
          </Reveal>

          <TextReveal
            as="h1"
            text={hotel.name}
            className="font-display text-display-lg font-normal text-cream"
            delay={0.05}
          />

          <Reveal delay={0.2}>
            <div className="mt-6 flex justify-center">
              <StarRating rating={hotel.starRating} size={17} />
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 text-[11px] uppercase tracking-luxe text-cream/50">
              <MapPin size={13} className="text-gold" /> {hotel.address}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Schema only — no visible trail. The masthead already establishes where
          the guest is, and a grey breadcrumb bar directly beneath it was pure
          clutter. */}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: hotel.name }]} />

      {/* ── Introduction ── */}
      <section className="section-tight container-luxe">
        <div className="mx-auto max-w-prose text-center">
          <Reveal>
            <p className="lead">{hotel.description}</p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/hotel/booking" className="btn-primary group">
                Book Your Stay <ArrowRight size={14} className="btn-arrow" />
              </Link>
              <Link href="/hotel/about" className="btn-outline group">
                Our Story <ArrowRight size={14} className="btn-arrow" />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Practical details as a hairline-divided strip. */}
        <Reveal delay={0.18}>
          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-luxe border border-ink/[0.07] bg-ink/[0.06] sm:grid-cols-3">
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

      <FeaturedRooms rooms={rooms} />
      <AmenitiesPreview amenities={hotel.amenities} href="/hotel/amenities" />
      <OffersPreview offers={offers} viewAllHref="/hotel/offers" reserveHref="/hotel/booking" />
      <GalleryPreview images={gallery} href="/hotel/gallery" />
    </main>
  );
}
