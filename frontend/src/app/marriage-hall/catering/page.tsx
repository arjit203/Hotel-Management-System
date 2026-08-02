import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChefHat, UtensilsCrossed } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { getTheHall } from "@/lib/hall";
import ShowcaseSection from "@/modules/hall/components/ShowcaseSection";
import HallEmpty from "@/modules/hall/components/HallEmpty";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHall();
  const name = data?.hall.name ?? "our banquet hall";

  return {
    title: `Catering & Dining — ${name}`,
    description: `Vegetarian and non-vegetarian menus, desserts, live counters and beverages at ${name}, with buffet, seated, VIP and family dining arrangements. Menus built with you.`,
  };
}

/**
 * Catering and dining showcase.
 *
 * ── No prices, deliberately ──
 * The owner has not set catering pricing (Phase 4 brief: "I DO NOT know the
 * final catering prices yet... Create Catering as editable showcase content
 * only. No hardcoded pricing."). So this page shows what the kitchen cooks and
 * how the food is served, and routes the money conversation to a call. Nothing
 * here is orderable — there is no cart, no per-plate rate and no quote engine.
 *
 * Dining shares this page because it is the same decision made twice: what the
 * food is, and how it reaches the table.
 */
export default async function MarriageHallCateringPage() {
  const data = await getTheHall();
  if (!data) return <HallEmpty title="Catering" />;

  const { hall, catering, dining } = data;

  return (
    <>
      <section className="section bg-cream">
        <div className="container-luxe">
          <PageHeader
            eyebrow="The kitchen"
            title="Food your guests will talk about"
            lead="Cooked in our own kitchen by our own chefs — never outsourced to a contractor. Every menu is built with you and tasted before you commit to it."
            crumbs={[
              { label: "Marriage Hall", href: "/marriage-hall" },
              { label: "Catering & Dining" },
            ]}
          />

          {catering.entries.length === 0 ? (
            <p className="py-16 text-center font-light text-warm-500">
              Our menus are being finalised. Call us and our chef will talk you through them.
            </p>
          ) : (
            <ShowcaseSection
              entries={catering.entries}
              categories={catering.categories}
              highlightsLabel="What to expect"
              sampleLabel="A taste of the menu"
            />
          )}
        </div>
      </section>

      {/* ══ Dining arrangements ══ */}
      {dining.entries.length > 0 && (
        <section className="section bg-cream-dark">
          <div className="container-luxe">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <Reveal>
                <p className="section-eyebrow justify-center">
                  <UtensilsCrossed size={13} className="text-gold" />
                  Dining
                </p>
              </Reveal>
              <TextReveal as="h2" text="How the food reaches your guests" className="section-title" />
              <Reveal delay={0.1}>
                <p className="lead mt-5">
                  Buffet lines, seated rounds, a private enclosure for immediate family, or silver
                  service for a smaller dinner. The arrangement changes how the evening feels as
                  much as the menu does.
                </p>
              </Reveal>
            </div>

            <ShowcaseSection
              entries={dining.entries}
              categories={dining.categories}
              highlightsLabel="How it works"
            />
          </div>
        </section>
      )}

      {/* ══ Tasting CTA ══ */}
      <section className="section-tight bg-ink">
        <div className="container-luxe">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
                <ChefHat size={22} strokeWidth={1.5} />
              </span>
              <p className="font-display text-[1.75rem] leading-tight text-cream sm:text-3xl">
                Taste it before you decide
              </p>
              <p className="mt-4 text-[0.9375rem] font-light leading-relaxed text-cream/70">
                We arrange a tasting for every confirmed wedding. Menus and pricing are put together
                with you during your consultation — never quoted off a page.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link href="/marriage-hall/availability" className="btn-gold group">
                  Arrange a tasting
                  <ArrowRight size={14} className="btn-arrow" />
                </Link>
                <a
                  href={`tel:${hall.contactPhone.replace(/\s/g, "")}`}
                  className="btn-ghost-light group"
                >
                  Call {hall.contactPhone}
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
