import Link from "next/link";
import { ArrowRight, BedDouble, PartyPopper, UtensilsCrossed } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

export interface VerticalCard {
  label: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  image?: string;
  icon: "hotel" | "restaurant" | "hall";
}

const ICONS = {
  hotel: BedDouble,
  restaurant: UtensilsCrossed,
  hall: PartyPopper,
} as const;

/**
 * "Three experiences, one address" — the estate overview on the home page.
 *
 * The home page previously sold only the Hotel, which left the Restaurant and
 * the Marriage Hall reachable solely through the top navigation. A visitor who
 * lands from a search for a wedding venue had no reason to believe this site had
 * one. This band fixes that without touching any existing section.
 *
 * A Server Component — only the reveal wrappers are client-side. Cards degrade
 * to a graded panel when a vertical has no photography yet, so an unseeded
 * install still renders cleanly rather than showing broken frames.
 */
export default function VerticalsPreview({ cards }: { cards: VerticalCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="section bg-ink">
      <div className="container-luxe">
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-16">
          <Reveal duration={0.6}>
            <p className="section-eyebrow flex justify-center !text-gold-light">The estate</p>
          </Reveal>
          <TextReveal
            as="h2"
            text="Three experiences, one address"
            className="section-title !text-cream"
            delay={0.05}
          />
          <Reveal delay={0.2}>
            <p className="lead mt-5 !text-cream/70">
              A hotel to stay in, a kitchen to eat at and a banquet hall to celebrate in — all on
              the same grounds, run by the same family.
            </p>
          </Reveal>
        </div>

        <Stagger className="grid gap-5 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = ICONS[card.icon];

            return (
              <StaggerItem key={card.href}>
                <Link
                  href={card.href}
                  className="group relative block h-full overflow-hidden rounded-luxe
                             transition-all duration-600 ease-luxe hover:-translate-y-2 hover:shadow-lift"
                >
                  <div className="aspect-[3/4]">
                    {card.image ? (
                      <LuxeImage
                        src={card.image}
                        alt={card.title}
                        wrapperClassName="h-full"
                        zoom
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-ink-soft via-ink-light to-ink" />
                    )}
                  </div>

                  {/* Permanent bottom scrim so the copy always reads, deepening
                      on hover so the card lifts as a whole. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-transparent
                               opacity-90 transition-opacity duration-600 ease-luxe group-hover:opacity-100"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-7 sm:p-8">
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-gold-light">
                      <Icon size={16} strokeWidth={1.5} />
                    </span>

                    <p className="text-[10px] uppercase tracking-eyebrow text-gold-light">
                      {card.label}
                    </p>
                    <h3 className="mt-1.5 font-display text-[1.75rem] leading-tight text-cream">
                      {card.title}
                    </h3>
                    <p className="mt-2.5 text-[0.9375rem] font-light leading-relaxed text-cream/70">
                      {card.description}
                    </p>

                    <span className="link-arrow mt-5 !text-gold-light">
                      {card.ctaLabel}
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
