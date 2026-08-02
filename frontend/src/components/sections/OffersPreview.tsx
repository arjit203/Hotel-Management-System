import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

interface Offer {
  _id: string;
  title: string;
  description?: string;
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
          {offers.slice(0, 3).map((offer, i) => (
            <StaggerItem key={offer._id} className="flex">
              <article className="card-luxe card-hover group flex w-full flex-col overflow-hidden p-9">
                {/* Oversized index numeral — an editorial cue that reads as
                    curated rather than as a list of database rows. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-6 top-4 font-display text-7xl leading-none text-gold/10
                             transition-all duration-700 ease-luxe group-hover:text-gold/20"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="mb-6 h-px w-12 bg-gold transition-all duration-600 ease-luxe group-hover:w-20" />

                <h3 className="card-title relative">{offer.title}</h3>

                {offer.description && <p className="body-muted mt-4 flex-1">{offer.description}</p>}

                {/* `group-hover` too, so the arrow also steps forward when the
                    whole offer card is hovered — not only the link itself. */}
                <Link href={reserveHref} className="link-arrow mt-8">
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
