import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheRestaurant } from "@/lib/restaurant";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import TimingsTable from "@/modules/restaurant/components/TimingsTable";
import DiningAreaCard from "@/modules/restaurant/components/DiningAreaCard";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { getAmenityIcon } from "@/lib/amenityIcons";
import { UtensilsCrossed } from "lucide-react";
import PropertyUnavailable from "@/components/PropertyUnavailable";

export const metadata: Metadata = {
  title: "Private & Family Dining",
  description:
    "Private dining rooms, family seating and outdoor tables at 7 Vachan — with capacities, features and opening hours.",
  alternates: { canonical: "/restaurant/dining" },
};

export default async function DiningPage() {
  const data = await getTheRestaurant();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/restaurant/dining"
        icon={UtensilsCrossed}
      />
    );
  }

  const { restaurant, diningAreas } = data;

  // Private and family rooms lead — they're the reason someone visits this page.
  const ordered = [...diningAreas].sort((a, b) => {
    const rank = { private: 0, family: 1, outdoor: 2, main: 3 } as const;
    return rank[a.areaType] - rank[b.areaType];
  });

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Where You'll Sit"
          title="Private & family dining"
          lead="Enclosed rooms for occasions that deserve their own space, generous family tables, and seats in the main room."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Restaurant", href: "/restaurant" },
            { label: "Dining Spaces" },
          ]}
        />

        {ordered.length === 0 ? (
          <EmptyState title="Dining space details are coming soon." />
        ) : (
          <Stagger className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {ordered.map((area) => (
              <StaggerItem key={area._id} className="flex">
                <DiningAreaCard area={area} />
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {/* ── Facilities + hours ── */}
        <section className="mt-24">
          <div className="mb-12">
            <p className="section-eyebrow">Good To Know</p>
            <TextReveal as="h2" text="Before you arrive" className="section-title" delay={0.05} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Reveal>
              <TimingsTable serviceHours={restaurant.serviceHours} />
            </Reveal>

            {restaurant.features.length > 0 && (
              <Reveal direction="left" delay={0.1}>
                <div className="h-full rounded-luxe border border-ink/[0.07] bg-white p-7 shadow-luxury">
                  <p className="mb-6 text-xs uppercase tracking-luxe text-ink">Facilities</p>
                  <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    {restaurant.features.map((f) => {
                      const Icon = getAmenityIcon(f.name);
                      return (
                        <li
                          key={f.name}
                          className="flex items-center gap-3 text-sm font-light text-warm-600"
                        >
                          <Icon size={15} strokeWidth={1.5} className="shrink-0 text-gold" />
                          {f.name}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
