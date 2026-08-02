import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flower2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { getTheHall } from "@/lib/hall";
import DecorationThemes from "@/modules/hall/components/DecorationThemes";
import ShowcaseSection from "@/modules/hall/components/ShowcaseSection";
import HallEmpty from "@/modules/hall/components/HallEmpty";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHall();
  const name = data?.hall.name ?? "our banquet hall";

  return {
    title: `Decoration Themes — ${name}`,
    description: `Classic, Royal, Traditional, Modern, Floral, Luxury, Minimal and Outdoor decoration themes at ${name}, each with its own colour palette. Floral styling for the mandap, stage, entrance and ceiling.`,
  };
}

/**
 * Decoration themes and floral styling.
 *
 * Floral lives on this page rather than a route of its own — it is decoration,
 * the brief's eight required routes don't include /floral, and splitting a
 * family's styling decision across two URLs would make them navigate to compare.
 */
export default async function MarriageHallDecorationsPage() {
  const data = await getTheHall();
  if (!data) return <HallEmpty title="Decoration" />;

  const { decorationThemes, floral } = data;

  return (
    <>
      <section className="section bg-cream">
        <div className="container-luxe">
          <PageHeader
            eyebrow="Decoration"
            title="Choose how the room should feel"
            lead="Eight styling directions, each with its own palette and its own character. Select a theme to see it in detail — and where we have the photograph, drag to compare the bare hall against the finished room."
            crumbs={[
              { label: "Marriage Hall", href: "/marriage-hall" },
              { label: "Decoration" },
            ]}
          />

          <DecorationThemes
            entries={decorationThemes.entries}
            categories={decorationThemes.categories}
          />

          {decorationThemes.entries.length === 0 && (
            <p className="py-16 text-center font-light text-warm-500">
              Our decoration portfolio is being photographed. Call us and we will show you the work
              in person.
            </p>
          )}
        </div>
      </section>

      {/* ══ Floral ══ */}
      {floral.entries.length > 0 && (
        <section className="section bg-cream-dark">
          <div className="container-luxe">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <Reveal>
                <p className="section-eyebrow justify-center">
                  <Flower2 size={13} className="text-gold" />
                  Floral
                </p>
              </Reveal>
              <TextReveal
                as="h2"
                text="Flowers, surface by surface"
                className="section-title"
              />
              <Reveal delay={0.1}>
                <p className="lead mt-5">
                  Arranged fresh on the morning of your function — the entrance, the stage, the
                  mandap, the tables, the ceiling and the light that holds it all together.
                </p>
              </Reveal>
            </div>

            <ShowcaseSection
              entries={floral.entries}
              categories={floral.categories}
              highlightsLabel="What we install"
            />
          </div>
        </section>
      )}

      {/* ══ CTA ══ */}
      <section className="section-tight bg-cream">
        <div className="container-luxe text-center">
          <Reveal>
            <p className="font-display text-2xl text-ink sm:text-3xl">
              Have a photograph in mind?
            </p>
            <p className="body-muted mx-auto mt-3 max-w-lg">
              Bring it to us. Most of our best work started as a picture on someone&apos;s phone.
            </p>
            <Link href="/marriage-hall/availability" className="btn-primary group mt-8">
              Talk to our decorator
              <ArrowRight size={14} className="btn-arrow" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
