import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, UtensilsCrossed } from "lucide-react";
import { getTheRestaurant } from "@/lib/restaurant";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import PropertyUnavailable from "@/components/PropertyUnavailable";

export const metadata: Metadata = {
  title: "Dining Offers",
  description: "Seasonal set menus, early-sitting offers and occasion packages at 7 Vachan.",
  alternates: { canonical: "/restaurant/offers" },
};

export default async function RestaurantOffersPage() {
  const data = await getTheRestaurant();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/restaurant/offers"
        icon={UtensilsCrossed}
      />
    );
  }

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Dining Offers"
          title="Worth planning around"
          lead="Set menus and occasion packages, available while they last."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Restaurant", href: "/restaurant" },
            { label: "Offers" },
          ]}
        />

        {data.offers.length === 0 ? (
          <EmptyState title="No offers running right now — check back soon." />
        ) : (
          <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {data.offers.map((offer, i) => (
              <StaggerItem key={offer._id} className="flex">
                <article className="card-luxe card-hover group flex w-full flex-col overflow-hidden p-9">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-6 top-4 font-display text-7xl leading-none text-gold/10 transition-colors duration-700 ease-luxe group-hover:text-gold/20"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mb-6 h-px w-12 bg-gold transition-all duration-600 ease-luxe group-hover:w-20" />
                  <h2 className="card-title relative">{offer.title}</h2>
                  {offer.description && <p className="body-muted mt-4 flex-1">{offer.description}</p>}
                  <Link href="/restaurant/reserve" className="link-arrow mt-8">
                    Reserve with this offer
                    <ArrowRight size={14} className="group-hover:translate-x-1" />
                  </Link>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </main>
  );
}
