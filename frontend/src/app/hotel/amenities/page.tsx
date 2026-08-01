import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import { getAmenityIcon } from "@/lib/amenityIcons";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Amenities",
  description: "Explore the luxury amenities and facilities available at 7 Vachan.",
  alternates: { canonical: "/hotel/amenities" },
};

export default async function AmenitiesPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Amenities" }]} />
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Facilities</p>
        <h1 className="section-title">Luxury Amenities</h1>
        <p className="text-ink/60 mt-4">Everything you need for a comfortable, memorable stay.</p>
      </div>

      {data.hotel.amenities.length === 0 ? (
        <p className="text-center text-ink/50 py-16">Amenity details coming soon.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {data.hotel.amenities.map((amenity) => {
            const Icon = getAmenityIcon(amenity.name);
            return (
              <div
                key={amenity.name}
                className="text-center bg-white rounded-2xl border border-ink/5 p-8 shadow-luxury hover:-translate-y-1 transition-transform"
              >
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/10 mb-4">
                  <Icon size={24} className="text-gold" />
                </span>
                <p className="text-ink font-medium">{amenity.name}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
