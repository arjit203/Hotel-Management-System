import type { Metadata } from "next";
import { getTheHotel } from "@/lib/hotel";
import { getTheRestaurant } from "@/lib/restaurant";
import { getTheHall } from "@/lib/hall";
import Hero from "@/components/sections/Hero";
import VerticalsPreview, { VerticalCard } from "@/components/sections/VerticalsPreview";
import QuickBookingWidget from "@/modules/hotel/components/home/QuickBookingWidget";
import Introduction from "@/components/sections/Introduction";
import FeaturedRooms from "@/modules/hotel/components/home/FeaturedRooms";
import ValueProps, { HOTEL_VALUE_POINTS } from "@/components/sections/ValueProps";
import AmenitiesPreview from "@/components/sections/AmenitiesPreview";
import OffersPreview from "@/components/sections/OffersPreview";
import GalleryPreview from "@/components/sections/GalleryPreview";
import Testimonials from "@/components/sections/Testimonials";
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
  // All three fetches are memoised by `cache()` and independent, so running
  // them together costs one round-trip set rather than three sequential ones.
  // A vertical that fails or isn't seeded simply drops out of the estate band.
  const [data, restaurantData, hallData] = await Promise.all([
    getTheHotel(),
    getTheRestaurant(),
    getTheHall(),
  ]);

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

  // The estate band. Hotel is always present (we returned early otherwise);
  // the other two appear only once they exist, so an unseeded install shows a
  // one-card row rather than two broken tiles.
  const verticalCards: VerticalCard[] = [
    {
      icon: "hotel",
      label: "Stay",
      title: "The Hotel",
      description:
        "Rooms and suites for a night, a week or a wedding party — with breakfast, a pool and a team that remembers your name.",
      href: "/hotel/rooms",
      ctaLabel: "Explore rooms",
      image: rooms[0]?.images?.[0] || gallery[0]?.imageUrl,
    },
  ];

  if (restaurantData) {
    verticalCards.push({
      icon: "restaurant",
      label: "Dine",
      title: restaurantData.restaurant.name,
      description:
        "North Indian and Awadhi cooking from a live tandoor, with a short seasonal menu that follows the morning market.",
      href: "/restaurant/menu",
      ctaLabel: "See the menu",
      image:
        restaurantData.gallery?.[0]?.imageUrl ||
        restaurantData.restaurant.images?.[0],
    });
  }

  if (hallData) {
    verticalCards.push({
      icon: "hall",
      label: "Celebrate",
      title: hallData.hall.name,
      description:
        "A pillarless banquet hall and open-air lawn for up to 1,200 guests, with decoration and catering handled in-house.",
      href: "/marriage-hall",
      ctaLabel: "Check your date",
      image: hallData.hall.heroImages?.[0] || hallData.gallery?.[0]?.imageUrl,
    });
  }

  return (
    <main>
      <Hero
        title={hotel.name}
        images={heroImages}
        primaryCta={{ label: "Book Your Stay", href: "/hotel/booking" }}
        secondaryCta={{ label: "Explore Rooms", href: "/hotel/rooms" }}
      />
      <QuickBookingWidget />

      <Introduction
        name={hotel.name}
        description={hotel.description}
        starRating={hotel.starRating}
        image={introImage}
        storyHref="/hotel/about"
        browseHref="/hotel/rooms"
      />

      <FeaturedRooms rooms={rooms} />

      {/* The estate: hotel, restaurant and banquet hall. Placed after the rooms
          so the home page still leads with the stay, but before amenities so a
          visitor who came for a wedding venue finds it above the fold-and-a-bit
          rather than only in the top navigation. */}
      <VerticalsPreview cards={verticalCards} />

      <ValueProps points={HOTEL_VALUE_POINTS} />
      <AmenitiesPreview amenities={hotel.amenities} href="/hotel/amenities" />
      <OffersPreview offers={offers} viewAllHref="/hotel/offers" reserveHref="/hotel/booking" />
      <GalleryPreview images={gallery} href="/hotel/gallery" />
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
