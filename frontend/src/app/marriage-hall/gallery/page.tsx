import type { Metadata } from "next";
import { ogDefaults } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, CalendarHeart } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import { getTheHall, orderedGalleryCategories } from "@/lib/hall";
import MasonryGallery from "@/modules/hall/components/MasonryGallery";
import HallEmpty from "@/modules/hall/components/HallEmpty";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHall();
  const name = data?.hall.name ?? "Our banquet hall";

  return {
    alternates: { canonical: "/marriage-hall/gallery" },
    title: `Gallery — Marriage Hall`,
    description: `Weddings, receptions, engagements, haldi, mehendi and sangeet photographed at ${name}. See the venue dressed for every kind of celebration.`,
    openGraph: {
      ...(await ogDefaults()),
      title: `Gallery — ${name}`,
      ...(data?.gallery?.[0]?.imageUrl ? { images: [data.gallery[0].imageUrl] } : {}),
    },
  };
}

/**
 * The venue portfolio.
 *
 * The single most important page in this module: families decide whether to
 * visit based on photographs, not copy. Everything else on the site is in
 * service of getting someone here and then to /availability.
 *
 * Server Component; <MasonryGallery> is the one client island.
 */
export default async function MarriageHallGalleryPage() {
  const data = await getTheHall();
  if (!data) return <HallEmpty title="Gallery" />;

  const { hall, gallery } = data;
  const categories = orderedGalleryCategories(gallery);

  return (
    <div className="section bg-cream">
      <div className="container-luxe">
        <PageHeader
          eyebrow="The portfolio"
          title="Every kind of celebration"
          lead={`Weddings, receptions, engagements and every function in between — photographed at ${hall.name}. Filter by occasion to see the room the way you are planning to use it.`}
          crumbs={[
            { label: "Marriage Hall", href: "/marriage-hall" },
            { label: "Gallery" },
          ]}
        />

        <MasonryGallery items={gallery} categories={categories} />

        {gallery.length > 0 && (
          <Reveal delay={0.1} className="mt-20 text-center">
            <div className="mx-auto max-w-xl rounded-luxe border border-gold/25 bg-gold/[0.05] px-8 py-10">
              <p className="font-display text-2xl text-ink">
                Picture your own function here
              </p>
              <p className="body-muted mx-auto mt-3 max-w-md">
                Check whether your date is open and we will arrange a walkthrough of the venue.
              </p>
              <Link href="/marriage-hall/availability" className="btn-primary group mt-7">
                <CalendarHeart size={14} />
                Check your date
                <ArrowRight size={14} className="btn-arrow" />
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
