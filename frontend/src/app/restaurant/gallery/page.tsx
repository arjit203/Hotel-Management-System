import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTheRestaurant } from "@/lib/restaurant";
import GalleryGrid from "@/components/GalleryGrid";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { UtensilsCrossed } from "lucide-react";
import PropertyUnavailable from "@/components/PropertyUnavailable";

export const metadata: Metadata = {
  title: "Restaurant Gallery",
  description: "Photographs of the dining rooms, private spaces and dishes at 7 Vachan.",
  alternates: { canonical: "/restaurant/gallery" },
};

export default async function RestaurantGalleryPage() {
  const data = await getTheRestaurant();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/restaurant/gallery"
        icon={UtensilsCrossed}
      />
    );
  }

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
