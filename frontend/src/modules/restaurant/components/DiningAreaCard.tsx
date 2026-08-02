import Link from "next/link";
import { ArrowRight, Users, IndianRupee } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import { getAmenityIcon } from "@/lib/amenityIcons";
import type { DiningAreaData } from "@/lib/restaurant";

/**
 * A seating area — Main Hall, Private Dining, Family Section, Terrace.
 *
 * Covers the Private Dining / Family Dining requirement. Same card anatomy as
 * RoomCard (stretched link, hover zoom, hairline-separated footer) so the two
 * verticals feel identical, but it is its own component because the payload is
 * different: no nightly rate, no occupancy — capacity, minimum party and an
 * optional minimum spend instead.
 *
 * Reuses `lib/amenityIcons` rather than introducing a second icon map.
 */

const AREA_LABEL: Record<DiningAreaData["areaType"], string> = {
  main: "Main Dining",
  private: "Private Dining",
  family: "Family Dining",
  outdoor: "Outdoor",
};

export default function DiningAreaCard({ area }: { area: DiningAreaData }) {
  return (
    <article className="card-luxe card-hover group flex w-full flex-col overflow-hidden">
      <div className="media h-56 shrink-0 sm:h-64">
        {area.images.length > 0 ? (
          <LuxeImage
            src={area.images[0]}
            alt={area.name}
            wrapperClassName="h-full w-full"
            zoom
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-cream-dark to-cream-deep" />
        )}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent opacity-70 transition-opacity duration-600 ease-luxe group-hover:opacity-100"
        />
        <span className="absolute left-5 top-5 rounded-full bg-cream/90 px-4 py-1.5 text-xs font-medium uppercase tracking-eyebrow text-ink backdrop-blur-sm">
          {AREA_LABEL[area.areaType]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-7">
        <h3 className="card-title">
          {/* Stretched link — one accessible link covering the whole card. */}
          <Link
            href={`/restaurant/reserve?area=${area._id}`}
            className="transition-colors duration-400 after:absolute after:inset-0 after:z-10 after:content-[''] hover:text-gold"
          >
            {area.name}
          </Link>
        </h3>

        <p className="body-muted mt-3 flex-1">{area.description}</p>

        {area.features.length > 0 && (
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {area.features.slice(0, 4).map((f) => {
              const Icon = getAmenityIcon(f);
              return (
                <li key={f} className="flex items-center gap-2 text-sm font-light text-warm-600">
                  <Icon size={14} strokeWidth={1.5} className="shrink-0 text-gold" /> {f}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ink/[0.07] pt-6">
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-luxe text-warm-500">
              <Users size={13} className="text-gold" />
              {area.minPartySize > 1
                ? `${area.minPartySize}–${area.maxPartySize} guests`
                : `Up to ${area.maxPartySize} per table`}
            </p>
            {area.minimumSpend ? (
              <p className="flex items-center gap-2 text-xs uppercase tracking-luxe text-warm-500">
                <IndianRupee size={13} className="text-gold" />
                Min. spend ₹{area.minimumSpend.toLocaleString("en-IN")}
              </p>
            ) : null}
          </div>

          <span aria-hidden="true" className="link-arrow shrink-0">
            Reserve
            <ArrowRight size={14} className="group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  );
}
