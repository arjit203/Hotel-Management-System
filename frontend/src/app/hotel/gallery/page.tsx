import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import GalleryGrid from "@/components/GalleryGrid";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Explore photos of 7 Vachan — rooms, interiors, dining, and property views.",
  alternates: { canonical: "/hotel/gallery" },
};

export default async function GalleryPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="Moments"
          title="The Gallery"
          lead="A glimpse into the rooms, interiors and quiet corners of 7 Vachan."
          crumbs={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Gallery" }]}
        />
        {data.gallery.length > 0 ? (
          <GalleryGrid images={data.gallery} />
        ) : (
          <EmptyState title="Gallery coming soon." />
        )}
      </div>
    </main>
  );
}
