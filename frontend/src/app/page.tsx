import type { Metadata } from "next";
import { getTheHotel } from "@/lib/hotel";
import { getTheRestaurant } from "@/lib/restaurant";
import { getTheHall } from "@/lib/hall";
import Hero from "@/components/sections/Hero";
import VerticalsPreview, { VerticalCard } from "@/components/sections/VerticalsPreview";
import QuickBookingWidget from "@/modules/hotel/components/home/QuickBookingWidget";
import Introduction from "@/components/sections/Introduction";
import FeaturedRooms from "@/modules/hotel/components/home/FeaturedRooms";
import ValueProps, { ESTATE_VALUE_POINTS } from "@/components/sections/ValueProps";
import AmenitiesPreview from "@/components/sections/AmenitiesPreview";
import OffersPreview from "@/components/sections/OffersPreview";
import EstateGallery, { EstateImage } from "@/components/sections/EstateGallery";
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

  // Hero backdrops: one strong frame from each vertical first, then the hotel's
  // remaining gallery as backfill. The home page is the estate's front door, so
  // opening on six bedroom shots undersells two thirds of the business — and it
  // also made the home and /hotel heroes identical, which they no longer are.
  //
  // De-duplicated so a repeated URL can't produce a "stuck" crossfade.
  const heroImages = Array.from(
    new Set(
      [
        hallData?.hall.heroImages?.[0],
        gallery[0]?.imageUrl,
        restaurantData?.gallery?.[0]?.imageUrl,
        hallData?.gallery?.[2]?.imageUrl,
        gallery[3]?.imageUrl,
        restaurantData?.gallery?.[4]?.imageUrl,
        ...gallery.map((g) => g.imageUrl),
        ...rooms.flatMap((r) => r.images || []),
      ].filter(Boolean) as string[]
    )
  ).slice(0, 6);

  // The estate gallery interleaves all three verticals so the default view is a
  // genuine mix rather than nine bedrooms. Each vertical's own Gallery tab in
  // the admin panel controls which photographs these are, and their order —
  // there is no separate "homepage gallery" to keep in sync.
  const estateImages: EstateImage[] = [
    ...gallery.slice(0, 6).map((g) => ({ ...g, module: "hotel" as const })),
    ...(restaurantData?.gallery || [])
      .slice(0, 6)
      .map((g) => ({ ...g, module: "restaurant" as const })),
    ...(hallData?.gallery || []).slice(0, 6).map((g) => ({ ...g, module: "hall" as const })),
  ];

  // Interleave so the unfiltered grid alternates verticals instead of showing
  // six of one then six of the next.
  const interleaved: EstateImage[] = [];
  for (let i = 0; i < 6; i += 1) {
    for (const m of ["hotel", "restaurant", "hall"] as const) {
      const forModule = estateImages.filter((e) => e.module === m);
      if (forModule[i]) interleaved.push(forModule[i]);
    }
  }

  // Offers from all three, each carrying its own CTA — a hotel offer has to
  // reach the room booking flow and a hall offer the enquiry form, so a single
  // shared href would send half of them to the wrong place.
  const estateOffers = [
    ...offers.map((o) => ({
      ...o,
      badge: "Hotel",
      href: "/hotel/booking",
    })),
    ...(restaurantData?.offers || []).map((o) => ({
      ...o,
      badge: "Restaurant",
      href: "/restaurant/reserve",
    })),
    ...(hallData?.offers || []).map((o) => ({
      ...o,
      badge: "Marriage Hall",
      href: "/marriage-hall/availability",
    })),
  ];

  // Reviews from all three. The headline average is recomputed as a weighted
  // mean over the three counts rather than averaging the three averages, which
  // would let a vertical with two reviews outweigh one with fifty.
  const reviewSources = [
    { reviews, summary: reviewSummary },
    { reviews: restaurantData?.reviews || [], summary: restaurantData?.reviewSummary },
    { reviews: hallData?.reviews || [], summary: hallData?.reviewSummary },
  ];

  const estateReviewCount = reviewSources.reduce((sum, r) => sum + (r.summary?.count || 0), 0);
  const estateReviewAverage =
    estateReviewCount > 0
      ? reviewSources.reduce(
          (sum, r) => sum + (r.summary?.average || 0) * (r.summary?.count || 0),
          0
        ) / estateReviewCount
      : 0;

  // Round-robin so the carousel opens with a spread rather than three hotel
  // reviews in a row.
  const estateReviews: typeof reviews = [];
  for (let i = 0; i < 4; i += 1) {
    for (const source of reviewSources) {
      if (source.reviews[i]) estateReviews.push(source.reviews[i]);
    }
  }

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
      {/* The estate's front door. `/hotel` has its own hero with hotel-only
          imagery and hotel CTAs; this one speaks for all three. */}
      <Hero
        title="7 Vachan"
        images={heroImages}
        eyebrow="Hotel · Restaurant · Banquets"
        tagline="One address for the night you stay, the meal you remember and the day you'll never forget."
        primaryCta={{ label: "Book Your Stay", href: "/hotel/booking" }}
        secondaryCta={{ label: "Explore the estate", href: "#estate" }}
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
          so the home page still leads with the stay, but early enough that a
          visitor who came for a wedding venue finds it without hunting the nav. */}
      <div id="estate" className="anchor-offset">
        <VerticalsPreview cards={verticalCards} />
      </div>

      {/* Estate-wide, not hotel-only — this band speaks for all three. */}
      <ValueProps
        points={ESTATE_VALUE_POINTS}
        eyebrow="Why 7 Vachan"
        title="Three businesses, one standard"
      />

      <AmenitiesPreview amenities={hotel.amenities} href="/hotel/amenities" />
      <OffersPreview
        offers={estateOffers}
        viewAllHref="/hotel/offers"
        reserveHref="/hotel/booking"
        eyebrow="Across the estate"
        title="What's on right now"
      />

      <EstateGallery images={interleaved} />
      <Testimonials
        reviews={estateReviews}
        average={estateReviewAverage}
        count={estateReviewCount}
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
