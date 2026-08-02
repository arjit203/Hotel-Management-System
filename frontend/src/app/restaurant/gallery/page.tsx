import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheRestaurant } from "@/lib/restaurant";
import GalleryGrid from "@/components/GalleryGrid";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Restaurant Gallery",
  description: "Photographs of the dining rooms, private spaces and dishes at 7 Vachan.",
  alternates: { canonical: "/restaurant/gallery" },
};

export default async function RestaurantGalleryPage() {
  const data = await getTheRestaurant();
  if (!data) return notFound();

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="The Room"
          title="Photo gallery"
          lead="The dining rooms, the private spaces, and a few plates worth photographing."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Restaurant", href: "/restaurant" },
            { label: "Gallery" },
          ]}
        />
        {data.gallery.length > 0 ? (
          <GalleryGrid images={data.gallery} />
        ) : (
          <EmptyState title="Photographs coming soon." />
        )}
      </div>
    </main>
  );
}
