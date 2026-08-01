import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StarRating from "@/components/StarRating";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import Parallax from "@/components/motion/Parallax";
import LuxeImage from "@/components/motion/LuxeImage";

/**
 * Editorial welcome band, sat between the booking widget and the room grid.
 *
 * Composed entirely from data the home page already fetches (hotel name,
 * description, star rating, first gallery image) — no new API calls and no
 * invented content. Its job is rhythm: after the hero and the widget, the page
 * needs a calm, text-led moment before the next grid, otherwise the home page
 * reads as an unbroken stack of card rows.
 */
export default function Introduction({
  hotelName,
  description,
  starRating,
  image,
}: {
  hotelName: string;
  description: string;
  starRating: number;
  image?: string;
}) {
  return (
    <section className="section container-luxe">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        {/* ── Copy ── */}
        <div className="lg:col-span-6 lg:pr-8">
          <Reveal duration={0.6}>
            <p className="section-eyebrow">Welcome</p>
          </Reveal>

          <TextReveal
            as="h2"
            text={`A quieter kind of luxury`}
            className="section-title"
            delay={0.05}
          />

          <Reveal delay={0.18} distance={18}>
            <div className="mt-6 flex items-center gap-3">
              <StarRating rating={starRating} size={15} />
              <span className="text-[10px] uppercase tracking-eyebrow text-warm-400">
                {starRating}-Star Hospitality
              </span>
            </div>

            <p className="lead mt-6">{description}</p>

            <p className="body-muted mt-4">
              Rooted in the promise of &ldquo;{hotelName}&rdquo; — every arrival is met with the same
              care, whether you stay one night or a season.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/hotel/about" className="btn-outline group">
                Our Story <ArrowRight size={14} className="btn-arrow" />
              </Link>
              <Link href="/hotel/rooms" className="link-arrow">
                Browse rooms <ArrowRight size={14} />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* ── Imagery: tall frame with a parallax drift and an offset gold rule ── */}
        <div className="relative lg:col-span-6">
          <Reveal direction="left" duration={0.9} scale className="relative">
            <div className="media h-[380px] rounded-airy sm:h-[480px] lg:h-[560px]">
              {image ? (
                <Parallax strength={8} className="h-full w-full">
                  <LuxeImage
                    src={image}
                    alt={`${hotelName} — interiors`}
                    wrapperClassName="h-full w-full"
                    width={1200}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </Parallax>
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-cream-dark to-cream-deep" />
              )}
            </div>

            {/* Offset frame — a classic print device that adds depth cheaply. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-5 -right-5 -z-10 hidden h-full w-full rounded-airy border border-gold/30 sm:block"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
