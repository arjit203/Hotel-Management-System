import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import { getAmenityIcon } from "@/lib/amenityIcons";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Stagger, StaggerScaleItem } from "@/components/motion/Stagger";
import { BedDouble } from "lucide-react";
import PropertyUnavailable from "@/components/PropertyUnavailable";

export const metadata: Metadata = {
  title: "Amenities",
  description: "Explore the luxury amenities and facilities available at 7 Vachan.",
  alternates: { canonical: "/hotel/amenities" },
};

export default async function AmenitiesPage() {
  const data = await getTheHotel();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/hotel/amenities"
        icon={BedDouble}
      />
    );
  }

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Facilities"
          title="Amenities"
          lead="Everything considered in advance, so nothing needs asking for."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Hotel", href: "/hotel" },
            { label: "Amenities" },
          ]}
        />

        {data.hotel.amenities.length === 0 ? (
          <EmptyState title="Amenity details coming soon." />
        ) : (
          <Stagger
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
            stagger={0.055}
          >
            {data.hotel.amenities.map((amenity) => {
              const Icon = getAmenityIcon(amenity.name);
              return (
                <StaggerScaleItem key={amenity.name}>
                  <div className="group flex h-full flex-col items-center justify-center gap-5 rounded-luxe border border-ink/[0.07] bg-white px-5 py-12 text-center transition-all duration-600 ease-luxe hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-luxury">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/[0.08] transition-colors duration-600 ease-luxe group-hover:bg-gold/15">
                      <Icon
                        size={22}
                        strokeWidth={1.5}
                        className="text-gold transition-transform duration-600 ease-luxe group-hover:scale-110"
                      />
                    </span>
                    <p className="text-[11px] font-medium uppercase tracking-luxe text-ink/75">
                      {amenity.name}
                    </p>
                  </div>
                </StaggerScaleItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </main>
  );
}
