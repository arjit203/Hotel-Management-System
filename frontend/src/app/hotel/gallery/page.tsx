import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheHotel } from "@/lib/hotel";
import GalleryGrid from "@/components/GalleryGrid";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Explore photos of 7 Vachan — rooms, interiors, dining, and property views.",
  alternates: { canonical: "/hotel/gallery" },
};

export default async function GalleryPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Hotel", href: "/hotel" }, { label: "Gallery" }]} />
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="section-eyebrow justify-center flex">Moments</p>
        <h1 className="section-title">Gallery</h1>
        <p className="text-ink/60 mt-4">A glimpse into the 7 Vachan experience.</p>
      </div>
      {data.gallery.length > 0 ? (
        <GalleryGrid images={data.gallery} />
      ) : (
        <p className="text-center text-ink/50 py-16">Gallery coming soon.</p>
      )}
    </main>
  );
}
