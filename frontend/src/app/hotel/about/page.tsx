import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Award, BedDouble, HeartHandshake, Sparkles } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import StarRating from "@/components/StarRating";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import Parallax from "@/components/motion/Parallax";
import LuxeImage from "@/components/motion/LuxeImage";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import PropertyUnavailable from "@/components/PropertyUnavailable";

export const metadata: Metadata = {
  title: "About Us",
  description: "The story, values, and promise behind 7 Vachan.",
  alternates: { canonical: "/hotel/about" },
};

const VALUES = [
  {
    icon: Sparkles,
    title: "Our Vision",
    desc: "To be the most trusted name in hospitality — where every guest feels genuinely at home.",
  },
  {
    icon: Award,
    title: "Our Standard",
    desc: "Premium comfort, meticulous cleanliness, and attention to detail in every room.",
  },
  {
    icon: HeartHandshake,
    title: "Our Promise",
    desc: "Warm, personal service — treating every guest like family, every single time.",
  },
];

export default async function AboutPage() {
  const data = await getTheHotel();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/hotel/about"
        icon={BedDouble}
      />
    );
  }

  const { hotel, gallery } = data;
  const heroImage = gallery[0]?.imageUrl;

  return (
    <main>
      <div className="container-luxe pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Our Story"
          title={`About ${hotel.name}`}
          align="left"
          crumbs={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "About" }]}
        />
      </div>

      {/* ── Narrative + imagery ── */}
      <section className="container-luxe pb-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Reveal>
              <div className="mb-7 flex items-center gap-3">
                <StarRating rating={hotel.starRating} size={15} />
                <span className="text-[10px] uppercase tracking-eyebrow text-warm-400">
                  {hotel.starRating}-Star Hospitality
                </span>
              </div>

              <p className="lead">{hotel.description}</p>

              <p className="body-muted mt-5">
                Rooted in the promise of &ldquo;7 Vachan&rdquo; — seven vows of hospitality — every
                stay here is built on trust, comfort, and genuine care for our guests.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/hotel/booking" className="btn-primary group">
                  Book Your Stay <ArrowRight size={14} className="btn-arrow" />
                </Link>
                <Link href="/hotel/rooms" className="link-arrow">
                  See our rooms <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-6">
            <Reveal direction="left" duration={0.9} scale>
              <div className="media h-[360px] rounded-airy sm:h-[460px] lg:h-[540px]">
                {heroImage ? (
                  <Parallax strength={8} className="h-full w-full">
                    <LuxeImage
                      src={heroImage}
                      alt={hotel.name}
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
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="section mt-8 bg-cream-dark">
        <div className="container-luxe">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Reveal duration={0.6}>
              <p className="section-eyebrow flex justify-center">What We Stand For</p>
            </Reveal>
            <TextReveal as="h2" text="Seven vows, one standard" className="section-title" delay={0.05} />
          </div>

          <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8" stagger={0.1}>
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title} className="flex">
                <div className="card-luxe card-hover group flex w-full flex-col items-center px-8 py-12 text-center">
                  <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/25 transition-all duration-600 ease-luxe group-hover:border-gold/60 group-hover:bg-gold/[0.07]">
                    <Icon
                      size={22}
                      strokeWidth={1.5}
                      className="text-gold transition-transform duration-600 ease-luxe group-hover:scale-110"
                    />
                  </span>
                  <h3 className="card-title">{title}</h3>
                  <p className="body-muted mt-3">{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </main>
  );
}
