import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAmenityIcon } from "@/lib/amenityIcons";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerScaleItem } from "@/components/motion/Stagger";

export default function AmenitiesPreview({
  amenities,
  href,
  eyebrow = "Facilities",
  title = "Considered comforts",
  ctaLabel = "Explore All Amenities",
}: {
  amenities: { name: string; icon?: string }[];
  href: string;
  eyebrow?: string;
  title?: string;
  ctaLabel?: string;
}) {
  if (amenities.length === 0) return null;

  return (
    <section className="section container-luxe">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <Reveal duration={0.6}>
          <p className="section-eyebrow flex justify-center">{eyebrow}</p>
        </Reveal>
        <TextReveal as="h2" text={title} className="section-title" delay={0.05} />
      </div>

      {/* Flex-wrap, not a fixed 6-column grid: the list is admin-curated and is
          often short, and two tiles pinned to the left of a six-column track
          read as a half-loaded section. Centred fixed-width tiles look composed
          at any count. */}
      <Stagger
        className="flex flex-wrap justify-center gap-4 sm:gap-5"
        stagger={0.06}
      >
        {amenities.slice(0, 6).map((amenity) => {
          const Icon = getAmenityIcon(amenity.name);
          return (
            <StaggerScaleItem
              key={amenity.name}
              className="w-[calc(50%-0.5rem)] sm:w-[11.5rem] lg:w-[11.25rem]"
            >
              <div
                className="group flex h-full flex-col items-center justify-center gap-4 rounded-luxe border border-ink/[0.07]
                           bg-white px-4 py-8 text-center transition-all duration-600 ease-luxe
                           hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-luxury"
              >
                <Icon
                  size={26}
                  strokeWidth={1.5}
                  className="text-gold transition-transform duration-600 ease-luxe group-hover:-translate-y-0.5 group-hover:scale-110"
                />
                <p className="text-[0.9375rem] font-medium leading-snug text-ink/85">{amenity.name}</p>
              </div>
            </StaggerScaleItem>
          );
        })}
      </Stagger>

      <Reveal delay={0.1} className="mt-12 text-center">
        <Link href={href} className="btn-outline group">
          {ctaLabel} <ArrowRight size={14} className="btn-arrow" />
        </Link>
      </Reveal>
    </section>
  );
}
