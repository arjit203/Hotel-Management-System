import type { Metadata } from "next";
import { getTheHotel } from "@/lib/hotel";
import Hero from "@/modules/hotel/components/home/Hero";
import QuickBookingWidget from "@/modules/hotel/components/home/QuickBookingWidget";
import FeaturedRooms from "@/modules/hotel/components/home/FeaturedRooms";
import WhyChooseUs from "@/modules/hotel/components/home/WhyChooseUs";
import AmenitiesPreview from "@/modules/hotel/components/home/AmenitiesPreview";
import OffersPreview from "@/modules/hotel/components/home/OffersPreview";
import GalleryPreview from "@/modules/hotel/components/home/GalleryPreview";
import Testimonials from "@/modules/hotel/components/home/Testimonials";
import MapPlaceholder from "@/components/MapPlaceholder";

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
      <main className="min-h-[60vh] flex items-center justify-center">
        <p className="text-ink/60">We&apos;re unable to load hotel details right now. Please try again shortly.</p>
      </main>
    );
  }

  const { hotel, rooms, gallery, offers, reviews, reviewSummary } = data;
  const heroImages = [
    ...rooms.flatMap((r) => r.images || []),
    ...gallery.map((g) => g.imageUrl),
  ].slice(0, 6);

  return (
    <main>
      <Hero hotelName={hotel.name} images={heroImages} />
      <QuickBookingWidget />
      <FeaturedRooms rooms={rooms} />
      <WhyChooseUs />
      <AmenitiesPreview amenities={hotel.amenities} />
      <OffersPreview offers={offers} />
      <GalleryPreview images={gallery} />
      <Testimonials reviews={reviews} average={reviewSummary.average} count={reviewSummary.count} />
      <section className="mx-auto max-w-4xl px-5 sm:px-8 pb-20">
        <div className="text-center mb-8">
          <p className="section-eyebrow justify-center flex">Find Us</p>
          <h2 className="section-title">Visit 7 Vachan</h2>
        </div>
        <MapPlaceholder address={hotel.address} />
      </section>
    </main>
  );
}
