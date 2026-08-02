import Link from "next/link";
import { ArrowRight, Check, Crown, Users } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import type { HallPackage } from "@/lib/hall";

/**
 * Package tier cards.
 *
 * A Server Component — nothing here is interactive beyond links, so it stays out
 * of the client bundle. The reveal comes from the shared <Stagger>, whose
 * wrapper is the only client boundary.
 *
 * ── On pricing ──
 * `priceLabel` is rendered verbatim and is a display string, never a number.
 * The venue has not published pricing (Phase 4 brief), so the card leads with
 * what the tier *includes* and treats the figure as secondary. Do not add a
 * currency symbol or "from ₹" wrapper around it — the admin controls that text
 * entirely, and prefixing it would produce "from On request".
 */
export default function PackageCards({
  packages,
  enquiryHref = "/marriage-hall/availability",
  /** Trim long inclusion lists on overview pages; full list on /packages. */
  maxInclusions,
  className,
}: {
  packages: HallPackage[];
  enquiryHref?: string;
  maxInclusions?: number;
  className?: string;
}) {
  if (packages.length === 0) return null;

  return (
    <Stagger className={`grid gap-6 md:grid-cols-2 xl:grid-cols-4 ${className || ""}`}>
      {packages.map((pkg) => {
        const inclusions = maxInclusions ? pkg.inclusions.slice(0, maxInclusions) : pkg.inclusions;
        const hidden = pkg.inclusions.length - inclusions.length;

        return (
          <StaggerItem key={pkg._id} className="h-full">
            <article
              className={`card-luxe card-hover group flex h-full flex-col overflow-hidden ${
                pkg.isFeatured ? "!border-gold/40 ring-1 ring-gold/20" : ""
              }`}
            >
              {pkg.imageUrl && (
                <div className="relative">
                  <LuxeImage
                    src={pkg.imageUrl}
                    alt={pkg.name}
                    wrapperClassName="aspect-[16/10]"
                    zoom
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                  {pkg.isFeatured && (
                    <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-[10px] uppercase tracking-eyebrow text-ink shadow-gold">
                      <Crown size={11} />
                      Most chosen
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-1 flex-col p-7">
                <h3 className="font-display text-[1.75rem] leading-tight text-ink">{pkg.name}</h3>
                {pkg.tagline && (
                  <p className="mt-1 text-xs uppercase tracking-luxe text-gold-dark">
                    {pkg.tagline}
                  </p>
                )}

                <p className="body-muted mt-4">{pkg.description}</p>

                {(pkg.suitableForMinGuests || pkg.suitableForMaxGuests) && (
                  <p className="mt-5 flex items-center gap-2 text-sm font-light text-warm-500">
                    <Users size={14} className="shrink-0 text-gold" aria-hidden="true" />
                    {pkg.suitableForMinGuests && pkg.suitableForMaxGuests
                      ? `${pkg.suitableForMinGuests}–${pkg.suitableForMaxGuests} guests`
                      : `Up to ${pkg.suitableForMaxGuests ?? pkg.suitableForMinGuests} guests`}
                  </p>
                )}

                {inclusions.length > 0 && (
                  <ul className="mt-6 space-y-2.5 border-t border-ink/[0.07] pt-6">
                    {inclusions.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check
                          size={13}
                          strokeWidth={2}
                          className="mt-1 shrink-0 text-gold"
                          aria-hidden="true"
                        />
                        <span className="text-[0.875rem] font-light leading-relaxed text-warm-600">
                          {item}
                        </span>
                      </li>
                    ))}
                    {hidden > 0 && (
                      <li className="pl-[1.4rem] text-[0.8125rem] font-light italic text-warm-400">
                        and {hidden} more
                      </li>
                    )}
                  </ul>
                )}

                <div className="mt-auto pt-7">
                  <p className="meta">Investment</p>
                  <p className="price mt-1 text-xl">{pkg.priceLabel}</p>

                  <Link
                    href={`${enquiryHref}?package=${encodeURIComponent(pkg.slug)}`}
                    className={`group/btn mt-5 w-full ${pkg.isFeatured ? "btn-gold" : "btn-outline"}`}
                  >
                    Enquire
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-400 ease-luxe group-hover/btn:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </article>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
