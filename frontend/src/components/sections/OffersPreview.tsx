import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

interface Offer {
  _id: string;
  title: string;
  description?: string;
  /**
   * Per-offer CTA target, overriding `reserveHref`.
   *
   * Needed by the home page, which shows offers from all three verticals in one
   * band — a hotel offer must lead to the room booking flow and a hall offer to
   * the enquiry form, so a single shared href cannot serve both. Optional, so
   * the hotel and restaurant pages keep passing one href for their own offers.
   */
  href?: string;
  /** Small label identifying which vertical an offer belongs to. */
  badge?: string;
}

export default function OffersPreview({
  offers,
  viewAllHref,
  reserveHref,
  eyebrow = "Special Packages",
  title = "Exclusive offers",
  reserveLabel = "Reserve this offer",
}: {
  offers: Offer[];
  /** "View All Offers" target. */
  viewAllHref: string;
  /** Per-offer CTA target. */
  reserveHref: string;
  eyebrow?: string;
  title?: string;
  reserveLabel?: string;
}) {
  if (offers.length === 0) return null;

  return (
    <section className="section bg-cream-dark">
      <div className="container-luxe">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Reveal duration={0.6}>
            <p className="section-eyebrow flex justify-center">{eyebrow}</p>
          </Reveal>
          <TextReveal as="h2" text={title} className="section-title" delay={0.05} />
        </div>

        <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {offers.slice(0, 3).map((offer) => (
            <StaggerItem key={offer._id} className="flex">
              {/* The oversized 01/02/03 numeral that used to sit here was removed
                  in the readability pass: at gold/10 on white it was invisible
                  and read as decoration for its own sake. */}
              <article className="card-luxe card-hover group flex w-full flex-col overflow-hidden p-8 sm:p-9">
                <span className="mb-5 h-px w-12 bg-gold transition-all duration-600 ease-luxe group-hover:w-20" />

                {offer.badge && (
                  <span className="relative mb-4 inline-block w-fit rounded-full border border-gold/30 bg-gold/[0.06] px-3.5 py-1 text-[0.8125rem] font-medium uppercase tracking-luxe text-gold-dark">
                    {offer.badge}
                  </span>
                )}

                <h3 className="card-title relative">{offer.title}</h3>

                {offer.description && <p className="body-muted mt-4 flex-1">{offer.description}</p>}

                {/* `group-hover` too, so the arrow also steps forward when the
                    whole offer card is hovered — not only the link itself. */}
                <Link href={offer.href || reserveHref} className="link-arrow mt-7">
                  {reserveLabel}
                  <ArrowRight size={14} className="group-hover:translate-x-1" />
                </Link>
              </article>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.1} className="mt-14 text-center">
          <Link href={viewAllHref} className="btn-primary group">
            View All Offers <ArrowRight size={14} className="btn-arrow" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
