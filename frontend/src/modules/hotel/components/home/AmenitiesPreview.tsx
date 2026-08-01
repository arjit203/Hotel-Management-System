import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAmenityIcon } from "@/lib/amenityIcons";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerScaleItem } from "@/components/motion/Stagger";

export default function AmenitiesPreview({ amenities }: { amenities: { name: string; icon?: string }[] }) {
  if (amenities.length === 0) return null;

  return (
    <section className="section container-luxe">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <Reveal duration={0.6}>
          <p className="section-eyebrow flex justify-center">Facilities</p>
        </Reveal>
        <TextReveal as="h2" text="Considered comforts" className="section-title" delay={0.05} />
      </div>

      <Stagger
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6"
        stagger={0.06}
      >
        {amenities.slice(0, 6).map((amenity) => {
          const Icon = getAmenityIcon(amenity.name);
          return (
            <StaggerScaleItem key={amenity.name}>
              <div
                className="group flex h-full flex-col items-center justify-center gap-4 rounded-luxe border border-ink/[0.07]
                           bg-white px-4 py-9 text-center transition-all duration-600 ease-luxe
                           hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-luxury"
              >
                <Icon
                  size={24}
                  strokeWidth={1.5}
                  className="text-gold transition-transform duration-600 ease-luxe group-hover:-translate-y-0.5 group-hover:scale-110"
                />
                <p className="text-[11px] font-medium uppercase tracking-luxe text-ink/70">{amenity.name}</p>
              </div>
            </StaggerScaleItem>
          );
        })}
      </Stagger>

      <Reveal delay={0.1} className="mt-14 text-center">
        <Link href="/hotel/amenities" className="btn-outline group">
          Explore All Amenities <ArrowRight size={14} className="btn-arrow" />
        </Link>
      </Reveal>
    </section>
  );
}
