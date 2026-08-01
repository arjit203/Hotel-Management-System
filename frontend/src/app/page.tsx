import type { Metadata } from "next";
import { getTheHotel } from "@/lib/hotel";
import Hero from "@/modules/hotel/components/home/Hero";
import QuickBookingWidget from "@/modules/hotel/components/home/QuickBookingWidget";
import Introduction from "@/modules/hotel/components/home/Introduction";
import FeaturedRooms from "@/modules/hotel/components/home/FeaturedRooms";
import WhyChooseUs from "@/modules/hotel/components/home/WhyChooseUs";
import AmenitiesPreview from "@/modules/hotel/components/home/AmenitiesPreview";
import OffersPreview from "@/modules/hotel/components/home/OffersPreview";
import GalleryPreview from "@/modules/hotel/components/home/GalleryPreview";
import Testimonials from "@/modules/hotel/components/home/Testimonials";
import MapPlaceholder from "@/components/MapPlaceholder";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHotel();
  const hotel = data?.hotel;
  return {
    title: hotel?.metaTitle || "Home",
    description:
      hotel?.metaDescription ||
      "7 Vachan — a premium hotel experience with luxury rooms, fine dining, and warm hospitality in Satna.",
    alternates: { canonical: "/" },
    openGraph: {
      title: hotel?.metaTitle || "7 Vachan — Luxury Hotel & Stays",
      description: hotel?.metaDescription || undefined,
      images: data?.gallery?.[0]?.imageUrl ? [data.gallery[0].imageUrl] : undefined,
    },
  };
}

export default async function HomePage() {
  const data = await getTheHotel();

  if (!data) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6 text-center">
        <div>
          <p className="section-eyebrow flex justify-center">7 Vachan</p>
          <h1 className="section-title">Just a moment</h1>
          <p className="lead mx-auto mt-5 max-w-md">
            We&apos;re unable to load hotel details right now. Please try again shortly.
          </p>
        </div>
      </main>
    );
  }

  const { hotel, rooms, gallery, offers, reviews, reviewSummary } = data;

  // Hero backdrops: gallery photography first (it's the curated set), rooms as
  // backfill. De-duplicated so a repeated URL can't produce a "stuck" crossfade.
  const heroImages = Array.from(
    new Set([...gallery.map((g) => g.imageUrl), ...rooms.flatMap((r) => r.images || [])])
  ).slice(0, 6);

  // Prefer an image the hero isn't already showing first, so the welcome band
  // doesn't duplicate the opening frame.
  const introImage = gallery[1]?.imageUrl || gallery[0]?.imageUrl || rooms[0]?.images?.[0];

  return (
    <main>
      <Hero hotelName={hotel.name} images={heroImages} />
      <QuickBookingWidget />

      <Introduction
        hotelName={hotel.name}
        description={hotel.description}
        starRating={hotel.starRating}
        image={introImage}
      />

      <FeaturedRooms rooms={rooms} />
      <WhyChooseUs />
      <AmenitiesPreview amenities={hotel.amenities} />
      <OffersPreview offers={offers} />
      <GalleryPreview images={gallery} />
      <Testimonials
        reviews={reviews}
        average={reviewSummary.average}
        count={reviewSummary.count}
      />

      {/* ── Location ── */}
      <section className="section-tight container-luxe pb-24 sm:pb-28">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Reveal duration={0.6}>
            <p className="section-eyebrow flex justify-center">Find Us</p>
          </Reveal>
          <TextReveal as="h2" text="Visit 7 Vachan" className="section-title" delay={0.05} />
        </div>
        <Reveal delay={0.1} className="mx-auto max-w-4xl">
          <MapPlaceholder address={hotel.address} />
        </Reveal>
      </section>

      {/* No closing CTA band here on purpose: the Footer already opens with a
          site-wide "Your suite is waiting" reservation band, and stacking two
          near-identical invitations back-to-back cheapens both. */}
    </main>
  );
}
