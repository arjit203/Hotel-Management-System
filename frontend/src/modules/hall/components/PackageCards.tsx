import Link from "next/link";
import { ArrowRight, Check, Crown, Users } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import type { HallPackage } from "@/lib/hall";

/**
 * Package tier cards.
 *
 * ── Why this was redesigned ──
 * The first version put four cards in a four-column grid, each carrying a photo,
 * title, tagline, full description, guest range, a tick list and a boxed
 * "Investment / On request" block. At ~300px wide that is a very tall, very
 * narrow column of competing elements, and the price block in particular read
 * oddly: a heavyweight label announcing a non-answer.
 *
 * Now:
 *  • two columns on large screens, not four — each card gets room to breathe
 *  • the tier name sits on the photograph, so the card opens with one strong
 *    element instead of three stacked small ones
 *  • the guest range is a pill on the image, where it is scannable
 *  • "On request" is quiet supporting text beside the CTA, not a headline
 *  • inclusions are capped and the remainder counted, so cards stay even
 *
 * A Server Component — the reveal wrapper is the only client boundary.
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
    <Stagger className={`grid gap-6 lg:grid-cols-2 ${className || ""}`}>
      {packages.map((pkg) => {
        const inclusions = maxInclusions ? pkg.inclusions.slice(0, maxInclusions) : pkg.inclusions;
        const hidden = pkg.inclusions.length - inclusions.length;

        const guestRange =
          pkg.suitableForMinGuests && pkg.suitableForMaxGuests
            ? `${pkg.suitableForMinGuests}–${pkg.suitableForMaxGuests} guests`
            : pkg.suitableForMaxGuests
              ? `Up to ${pkg.suitableForMaxGuests} guests`
              : null;

        return (
          <StaggerItem key={pkg._id} className="h-full">
            <article
              className={`card-luxe card-hover group flex h-full flex-col overflow-hidden ${
                pkg.isFeatured ? "!border-gold/40 ring-1 ring-gold/20" : ""
              }`}
            >
              {/* ── Header: photograph carrying the tier name ── */}
              <div className="relative">
                {pkg.imageUrl ? (
                  <LuxeImage
                    src={pkg.imageUrl}
                    alt={pkg.name}
                    wrapperClassName="aspect-[16/9]"
                    zoom
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-ink-soft via-ink-light to-ink" />
                )}

                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent"
                />

                {pkg.isFeatured && (
                  <span className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-[10px] uppercase tracking-eyebrow text-ink shadow-gold">
                    <Crown size={11} />
                    Most chosen
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                  <div className="min-w-0">
                    <h3 className="font-display text-[2rem] leading-none text-cream">{pkg.name}</h3>
                    {pkg.tagline && (
                      <p className="mt-2 text-[11px] uppercase tracking-eyebrow text-gold-light">
                        {pkg.tagline}
                      </p>
                    )}
                  </div>

                  {guestRange && (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-cream/25 bg-ink/40 px-3 py-1.5 text-[11px] font-light text-cream backdrop-blur-sm">
                      <Users size={11} />
                      {guestRange}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Body ── */}
              <div className="flex flex-1 flex-col p-7">
                <p className="body-muted">{pkg.description}</p>

                {inclusions.length > 0 && (
                  <>
                    <p className="meta mt-7">What&apos;s included</p>
                    <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
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
                    </ul>
                    {hidden > 0 && (
                      <p className="mt-3 text-[0.8125rem] font-light italic text-warm-400">
                        …and {hidden} more, covered on your call
                      </p>
                    )}
                  </>
                )}

                {/* ── Footer: CTA leads, price label supports ──
                    `priceLabel` is admin-controlled free text ("On request" by
                    default) and is printed verbatim. Do not wrap it in "from" or
                    a currency symbol — that would produce "from On request". */}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-ink/[0.07] pt-6">
                  <span className="text-[0.8125rem] font-light text-warm-500">
                    {pkg.priceLabel}
                  </span>

                  <Link
                    href={`${enquiryHref}?package=${encodeURIComponent(pkg.slug)}`}
                    className={`group/btn ${pkg.isFeatured ? "btn-gold" : "btn-outline"}`}
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
