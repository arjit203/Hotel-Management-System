import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, UtensilsCrossed } from "lucide-react";
import { getTheRestaurant, todaysHours } from "@/lib/restaurant";
import RestaurantSchema from "@/components/RestaurantSchema";
import Breadcrumbs from "@/components/Breadcrumbs";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { cldImage, IMAGE_WIDTHS } from "@/lib/imageUrl";

// ── Shared sections, reused verbatim from the Hotel module's architecture ──
import Hero from "@/components/sections/Hero";
import Introduction from "@/components/sections/Introduction";
import ValueProps from "@/components/sections/ValueProps";
import AmenitiesPreview from "@/components/sections/AmenitiesPreview";
import OffersPreview from "@/components/sections/OffersPreview";
import GalleryPreview from "@/components/sections/GalleryPreview";
import Testimonials from "@/components/sections/Testimonials";
import MapPlaceholder from "@/components/MapPlaceholder";

// ── Restaurant-specific ──
import SpecialsSection from "@/modules/restaurant/components/SpecialsSection";
import TimingsTable from "@/modules/restaurant/components/TimingsTable";
import { RESTAURANT_VALUE_POINTS } from "@/modules/restaurant/valuePoints";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheRestaurant();
  const r = data?.restaurant;
  return {
    title: r?.metaTitle || r?.name || "Restaurant",
    description:
      r?.metaDescription ||
      r?.description?.slice(0, 155) ||
      "Dine at 7 Vachan — seasonal menus, private dining, and instant table reservation.",
    alternates: { canonical: "/restaurant" },
    openGraph: { images: data?.gallery?.[0]?.imageUrl ? [data.gallery[0].imageUrl] : undefined },
  };
}

export default async function RestaurantPage() {
  const data = await getTheRestaurant();
  if (!data) return notFound();

  const { restaurant, gallery, offers, reviews, reviewSummary, chefSpecials, todaysSpecials } = data;

  // Same backdrop strategy as the hotel home page: curated gallery first, the
  // venue's own images as backfill, de-duplicated so a repeat can't stall the fade.
  const heroImages = Array.from(
    new Set([...gallery.map((g) => g.imageUrl), ...restaurant.images])
  ).slice(0, 6);
  const introImage = gallery[1]?.imageUrl || gallery[0]?.imageUrl || restaurant.images[0];
  const openLine = todaysHours(restaurant.serviceHours);

  return (
    <main>
      <RestaurantSchema
        restaurant={restaurant}
        image={gallery[0]?.imageUrl}
        reviewSummary={reviewSummary}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: restaurant.name }]} />

      <Hero
        title={restaurant.name}
        images={heroImages}
        eyebrow="Dining at 7 Vachan"
        tagline={
          restaurant.cuisineTypes.length
            ? `${restaurant.cuisineTypes.join(" · ")} — cooked to order, served without hurry.`
            : "Cooked to order, served without hurry."
        }
        primaryCta={{ label: "Reserve A Table", href: "/restaurant/reserve" }}
        secondaryCta={{ label: "View Menu", href: "/restaurant/menu" }}
      />

      {/* ── Status strip: the three things a diner checks first ── */}
      <div className="container-luxe relative z-30 -mt-14 sm:-mt-16">
        <Reveal duration={0.8}>
          <div className="glass grid grid-cols-1 gap-px overflow-hidden rounded-luxe shadow-lift sm:grid-cols-3">
            {[
              { icon: Clock, label: "Hours", value: openLine || "See timings" },
              {
                icon: UtensilsCrossed,
                label: "Cuisine",
                value: restaurant.cuisineTypes.join(", ") || "Multi-cuisine",
              },
              { icon: Phone, label: "Reservations", value: restaurant.contactPhone },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 bg-white/70 px-7 py-6">
                <item.icon size={17} strokeWidth={1.5} className="shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-luxe text-warm-500">{item.label}</p>
                  <p className="mt-1 truncate text-sm text-ink">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <Introduction
        name={restaurant.name}
        description={restaurant.description}
        starRating={reviewSummary.average || 5}
        image={introImage}
        headline="A table worth lingering at"
        ratingLabel={
          reviewSummary.count > 0
            ? `${reviewSummary.average} from ${reviewSummary.count} reviews`
            : "Newly opened"
        }
        storyHref="/restaurant/dining"
        browseHref="/restaurant/menu"
        storyLabel="Private Dining"
        browseLabel="Browse the menu"
      />

      <SpecialsSection items={chefSpecials} variant="chef" tinted />
      <SpecialsSection items={todaysSpecials} variant="today" />

      <ValueProps
        points={RESTAURANT_VALUE_POINTS}
        eyebrow="Why Dine With Us"
        title="More than a meal"
      />

      <AmenitiesPreview
        amenities={restaurant.features}
        href="/restaurant/dining"
        eyebrow="The Room"
        title="What to expect"
        ctaLabel="Explore Dining Spaces"
      />

      <OffersPreview
        offers={offers}
        viewAllHref="/restaurant/offers"
        reserveHref="/restaurant/reserve"
        eyebrow="Dining Offers"
        title="Worth planning around"
        reserveLabel="Reserve with this offer"
      />

      <GalleryPreview images={gallery} href="/restaurant/gallery" eyebrow="The Room" title="A look inside" />

      <Testimonials reviews={reviews} average={reviewSummary.average} count={reviewSummary.count} />

      {/* ── Timings + location ── */}
      <section className="section-tight container-luxe pb-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Reveal duration={0.6}>
            <p className="section-eyebrow flex justify-center">Plan Your Visit</p>
          </Reveal>
          <TextReveal as="h2" text="When and where" className="section-title" delay={0.05} />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Reveal>
            <TimingsTable serviceHours={restaurant.serviceHours} />
          </Reveal>
          <Reveal direction="left" delay={0.1}>
            <MapPlaceholder address={restaurant.address} />
          </Reveal>
        </div>

        <Reveal delay={0.15} className="mt-12 text-center">
          <Link href="/restaurant/reserve" className="btn-primary group">
            Reserve A Table <ArrowRight size={14} className="btn-arrow" />
          </Link>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs uppercase tracking-luxe text-warm-500">
            <MapPin size={13} className="text-gold" /> {restaurant.address}
          </p>
        </Reveal>
      </section>
    </main>
  );
}
