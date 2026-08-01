import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAmenityIcon } from "@/lib/amenityIcons";

export default function AmenitiesPreview({ amenities }: { amenities: { name: string; icon?: string }[] }) {
  if (amenities.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Facilities</p>
        <h2 className="section-title">Luxury Amenities</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
        {amenities.slice(0, 6).map((amenity) => {
          const Icon = getAmenityIcon(amenity.name);
          return (
            <div key={amenity.name} className="text-center bg-white rounded-2xl border border-ink/5 p-6 shadow-luxury">
              <Icon size={24} className="mx-auto text-gold mb-3" />
              <p className="text-sm text-ink/80">{amenity.name}</p>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-12">
        <Link href="/hotel/amenities" className="btn-outline">
          Explore All Amenities <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
