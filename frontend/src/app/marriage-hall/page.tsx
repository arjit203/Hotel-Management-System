import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarHeart,
  Car,
  Check,
  Images,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Hero from "@/components/sections/Hero";
import Reveal from "@/components/motion/Reveal";
import Parallax from "@/components/motion/Parallax";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import LuxeImage from "@/components/motion/LuxeImage";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import HallSchema from "@/components/HallSchema";
import FaqAccordion from "@/components/FaqAccordion";
import { getTheHall } from "@/lib/hall";
import PackageCards from "@/modules/hall/components/PackageCards";
import HallEmpty from "@/modules/hall/components/HallEmpty";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHall();
  if (!data) {
    return {
      title: "Marriage Hall — 7 Vachan",
      description: "A banquet hall and open-air lawn for weddings and celebrations.",
    };
  }

  const { hall } = data;
  return {
    title: hall.metaTitle || `${hall.name} — Wedding & Banquet Venue`,
    description:
      hall.metaDescription ||
      `${hall.name}: ${hall.tagline || hall.description.slice(0, 140)}`,
    openGraph: {
      title: hall.metaTitle || hall.name,
      description: hall.metaDescription || hall.tagline || hall.description.slice(0, 160),
      images: hall.heroImages.slice(0, 1),
      type: "website",
    },
  };
}

/**
 * Marriage Hall landing page.
 *
 * A Server Component throughout — every interactive piece (<Hero>, the motion
 * wrappers, <FaqAccordion>) is its own client island, so the page itself stays
 * server-rendered for SEO. Attaching an event handler directly here would break
 * the whole app; see the CHANGELOG entry for 2026-08-01.
 *
 * Structure is deliberately cinematic and top-heavy on atmosphere: this page's
 * job is not to inform, it is to make a family picture their function in this
 * room and then press "check your date".
 */
export default async function MarriageHallPage() {
  const data = await getTheHall();
  if (!data) return <HallEmpty />;

  const { hall, packages, decorationThemes, catering, gallery, faqs, reviewSummary, reviews } =
    data;

  // The gallery doubles as the hero slider and the preview strip below.
  const galleryImages = gallery.map((g) => g.imageUrl);
  const heroImages = hall.heroImages.length > 0 ? hall.heroImages : galleryImages;
  const previewImages = gallery.slice(0, 7);

  const featuredThemes = decorationThemes.entries.slice(0, 3);
  const cateringCategories = catering.categories.slice(0, 5);

  return (
    <>
      <HallSchema
        hall={hall}
        image={heroImages[0]}
        reviewSummary={reviewSummary}
      />

      <Hero
        title={hall.name}
        images={heroImages}
        eyebrow="Weddings & Celebrations"
        tagline={hall.tagline || "Where your forever begins."}
        primaryCta={{ label: "Check your date", href: "/marriage-hall/availability" }}
        secondaryCta={{ label: "See the venue", href: "/marriage-hall/gallery" }}
      />

      {/* ══ Invitation ══ */}
      <section className="section bg-cream">
        <div className="container-luxe">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="section-eyebrow justify-center">The venue</p>
            </Reveal>
            <TextReveal
              as="h2"
              text="A room that holds the whole family"
              className="section-title"
            />
            <Reveal delay={0.15}>
              <p className="lead mx-auto mt-7 max-w-prose">{hall.description}</p>
            </Reveal>
          </div>

          {/* Headline numbers. AnimatedNumber counts up when scrolled into view. */}
          <Stagger className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 sm:mt-20 lg:grid-cols-4">
            <StatTile
              value={hall.seatedCapacity}
              label="Seated guests"
              icon={<Users size={17} strokeWidth={1.5} />}
            />
            <StatTile
              value={hall.floatingCapacity}
              label="Floating capacity"
              icon={<Sparkles size={17} strokeWidth={1.5} />}
            />
            {typeof hall.parkingCapacity === "number" && (
              <StatTile
                value={hall.parkingCapacity}
                label="Parking spaces"
                icon={<Car size={17} strokeWidth={1.5} />}
              />
            )}
            {typeof hall.guestRooms === "number" && (
              <StatTile
                value={hall.guestRooms}
                label="Guest rooms"
                icon={<CalendarHeart size={17} strokeWidth={1.5} />}
              />
            )}
          </Stagger>
        </div>
      </section>

      {/* ══ Spaces — parallax editorial ══ */}
      {hall.spaces.length > 0 && (
        <section className="section bg-cream-dark">
          <div className="container-luxe">
            <div className="mb-16 max-w-2xl">
              <Reveal>
                <p className="section-eyebrow">Three spaces</p>
              </Reveal>
              <TextReveal as="h2" text="Choose the setting for each function" className="section-title" />
              <Reveal delay={0.1}>
                <p className="lead mt-5">
                  Haldi on the lawn in the morning, the ceremony in the hall, the sangeet on the
                  terrace. Nobody has to travel between venues.
                </p>
              </Reveal>
            </div>

            <div className="space-y-16 lg:space-y-24">
              {hall.spaces.map((space, index) => {
                const image = galleryImages[index] ?? galleryImages[0];
                const imageFirst = index % 2 === 0;

                return (
                  <div
                    key={space.label}
                    className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
                  >
                    <div className={imageFirst ? "" : "lg:order-2"}>
                      {image && (
                        <Parallax strength={7} className="overflow-hidden rounded-luxe shadow-luxury">
                          <div className="aspect-[4/3]">
                            <LuxeImage
                              src={image}
                              alt={space.label}
                              wrapperClassName="h-full"
                              sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                          </div>
                        </Parallax>
                      )}
                    </div>

                    <Reveal
                      direction={imageFirst ? "left" : "right"}
                      className={imageFirst ? "" : "lg:order-1"}
                    >
                      <p className="section-eyebrow">Space {String(index + 1).padStart(2, "0")}</p>
                      <h3 className="section-title !text-display-sm">{space.label}</h3>
                      {space.description && <p className="lead mt-5">{space.description}</p>}

                      <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                        <span>
                          <span className="price block text-2xl">
                            {space.seated.toLocaleString("en-IN")}
                          </span>
                          <span className="meta">Seated</span>
                        </span>
                        <span>
                          <span className="price block text-2xl">
                            {space.floating.toLocaleString("en-IN")}
                          </span>
                          <span className="meta">Floating</span>
                        </span>
                      </div>
                    </Reveal>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══ Gallery preview — the emotional hook ══ */}
      {previewImages.length > 0 && (
        <section className="section bg-ink">
          <div className="container-luxe">
            <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <Reveal>
                  <p className="section-eyebrow !text-gold-light">The portfolio</p>
                </Reveal>
                <TextReveal
                  as="h2"
                  text="Four hundred celebrations, and counting"
                  className="section-title !text-cream"
                />
              </div>
              <Reveal delay={0.1}>
                <Link href="/marriage-hall/gallery" className="btn-ghost-light group">
                  <Images size={14} />
                  Open the gallery
                  <ArrowRight size={14} className="btn-arrow" />
                </Link>
              </Reveal>
            </div>

            {/* Editorial mosaic: one tall lead image, six supporting frames. */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {previewImages.map((item, index) => (
                <Reveal
                  key={item._id}
                  delay={Math.min(index, 6) * 0.06}
                  scale
                  className={
                    index === 0
                      ? "col-span-2 row-span-2 lg:col-span-2 lg:row-span-2"
                      : "col-span-1"
                  }
                >
                  <Link
                    href="/marriage-hall/gallery"
                    className="group block h-full"
                    aria-label={`${item.title || item.category} — open the gallery`}
                  >
                    <LuxeImage
                      src={item.imageUrl}
                      alt={item.title || `${item.category} at ${hall.name}`}
                      wrapperClassName={`rounded-luxe ${index === 0 ? "aspect-square" : "aspect-square"}`}
                      zoom
                      hoverScrim
                      sizes={index === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
                    />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ Decoration themes ══ */}
      {featuredThemes.length > 0 && (
        <section className="section bg-cream">
          <div className="container-luxe">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <Reveal>
                <p className="section-eyebrow justify-center">Decoration</p>
              </Reveal>
              <TextReveal as="h2" text="Choose how the room should feel" className="section-title" />
              <Reveal delay={0.1}>
                <p className="lead mt-5">
                  Eight styling directions, each with its own palette. Or bring us a photograph and
                  we will build it.
                </p>
              </Reveal>
            </div>

            <Stagger className="grid gap-6 md:grid-cols-3">
              {featuredThemes.map((theme) => (
                <StaggerItem key={theme._id}>
                  <Link
                    href="/marriage-hall/decorations"
                    className="group relative block overflow-hidden rounded-luxe shadow-luxury
                               transition-all duration-600 ease-luxe hover:-translate-y-1.5 hover:shadow-lift"
                  >
                    {theme.images[0] && (
                      <LuxeImage
                        src={theme.images[0]}
                        alt={theme.title}
                        wrapperClassName="aspect-[4/5]"
                        zoom
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"
                    />
                    <span className="absolute inset-x-0 bottom-0 p-7">
                      <span className="block text-[10px] uppercase tracking-eyebrow text-gold-light">
                        {theme.category}
                      </span>
                      <span className="mt-1.5 block font-display text-2xl text-cream">
                        {theme.title}
                      </span>
                      {theme.colorPalette.length > 0 && (
                        <span className="mt-4 flex gap-1.5">
                          {theme.colorPalette.map((hex) => (
                            <span
                              key={hex}
                              style={{ backgroundColor: hex }}
                              className="h-5 w-5 rounded-full border border-cream/40"
                            />
                          ))}
                        </span>
                      )}
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>

            <Reveal delay={0.15} className="mt-12 text-center">
              <Link href="/marriage-hall/decorations" className="btn-outline group">
                See every theme
                <ArrowRight size={14} className="btn-arrow" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ══ Packages ══ */}
      {packages.length > 0 && (
        <section className="section bg-cream-dark">
          <div className="container-luxe">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <Reveal>
                <p className="section-eyebrow justify-center">Packages</p>
              </Reveal>
              <TextReveal as="h2" text="Four ways to celebrate" className="section-title" />
              <Reveal delay={0.1}>
                <p className="lead mt-5">
                  Every package is a starting point. We adjust it around your family, your rituals
                  and your guest list.
                </p>
              </Reveal>
            </div>

            <PackageCards packages={packages} maxInclusions={4} />
          </div>
        </section>
      )}

      {/* ══ Catering ══ */}
      {cateringCategories.length > 0 && (
        <section className="section bg-cream">
          <div className="container-luxe">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <Reveal>
                  <p className="section-eyebrow">The kitchen</p>
                </Reveal>
                <TextReveal
                  as="h2"
                  text="Food your guests will talk about"
                  className="section-title"
                />
                <Reveal delay={0.1}>
                  <p className="lead mt-5">
                    Cooked in our own kitchen by our own chefs — never outsourced. Menus are built
                    with you, and tasted before you commit.
                  </p>
                </Reveal>

                <Reveal delay={0.2}>
                  <ul className="mt-9 space-y-3">
                    {cateringCategories.map((category) => (
                      <li key={category} className="flex items-center gap-3">
                        <Check size={14} strokeWidth={2} className="shrink-0 text-gold" />
                        <span className="text-[0.9375rem] font-light text-warm-600">
                          {category}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Reveal>

                <Reveal delay={0.3}>
                  <Link href="/marriage-hall/catering" className="btn-primary group mt-10">
                    <UtensilsCrossed size={14} />
                    Explore catering
                    <ArrowRight size={14} className="btn-arrow" />
                  </Link>
                </Reveal>
              </div>

              <Reveal direction="left" scale>
                {catering.entries[0]?.images[0] && (
                  <LuxeImage
                    src={catering.entries[0].images[0]}
                    alt="Catering at the venue"
                    wrapperClassName="aspect-[4/5] rounded-luxe shadow-luxury"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                )}
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ══ Testimonial ══ */}
      {reviews.length > 0 && reviewSummary.count > 0 && (
        <section className="section-tight bg-ink">
          <div className="container-luxe">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <p className="section-eyebrow justify-center !text-gold-light">
                  {reviewSummary.average.toFixed(1)} from {reviewSummary.count}{" "}
                  {reviewSummary.count === 1 ? "family" : "families"}
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <blockquote className="font-display text-[1.5rem] font-light leading-relaxed text-cream sm:text-[1.875rem]">
                  &ldquo;{reviews[0].comment}&rdquo;
                </blockquote>
                <p className="mt-7 text-xs uppercase tracking-eyebrow text-cream/50">
                  {reviews[0].guestName || "A guest"}
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <Link href="/marriage-hall/reviews" className="btn-ghost-light group mt-10">
                  Read every review
                  <ArrowRight size={14} className="btn-arrow" />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ══ FAQs ══ */}
      {faqs.length > 0 && (
        <section className="section bg-cream">
          <div className="container-luxe">
            <div className="mx-auto max-w-3xl">
              <div className="mb-12 text-center">
                <Reveal>
                  <p className="section-eyebrow justify-center">Before you ask</p>
                </Reveal>
                <TextReveal as="h2" text="The questions families ask us" className="section-title" />
              </div>
              <Reveal delay={0.1}>
                <FaqAccordion faqs={faqs} />
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ══ Closing CTA ══ */}
      <section className="relative overflow-hidden bg-ink py-24 sm:py-32">
        {heroImages[1] && (
          <>
            <div className="absolute inset-0 opacity-25">
              <LuxeImage
                src={heroImages[1]}
                alt=""
                wrapperClassName="h-full"
                priority={false}
                sizes="100vw"
              />
            </div>
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/60 to-ink/90"
            />
          </>
        )}

        <div className="container-luxe relative z-10 text-center">
          <Reveal>
            <p className="section-eyebrow justify-center !text-gold-light">Your date</p>
          </Reveal>
          <TextReveal
            as="h2"
            text="Come and see the room"
            className="section-title !text-cream"
          />
          <Reveal delay={0.15}>
            <p className="lead mx-auto mt-6 max-w-xl !text-cream/70">
              Check whether your date is open, tell us a little about the occasion, and we will
              call you. No payment, no obligation — just a conversation.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/marriage-hall/availability" className="btn-gold group">
                <CalendarHeart size={14} />
                Check your date
                <ArrowRight size={14} className="btn-arrow" />
              </Link>
              <a href={`tel:${hall.contactPhone.replace(/\s/g, "")}`} className="btn-ghost-light group">
                Call {hall.contactPhone}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/** Counting stat tile. Server-rendered; only the number animates. */
function StatTile({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <StaggerItem className="text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/[0.09] text-gold">
        {icon}
      </span>
      <p className="price text-display-sm">
        <AnimatedNumber value={value} />
      </p>
      <p className="meta mt-2">{label}</p>
    </StaggerItem>
  );
}
