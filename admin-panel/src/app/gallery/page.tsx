"use client";

import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/States";
import GalleryManager from "@/components/content/GalleryManager";
import PropertyScopeNotice, { NoPropertyState } from "@/components/layout/PropertyScopeNotice";
import { uploadImage, uploadRestaurantImage } from "@/lib/api";
import { useBusiness } from "@/lib/businessContext";
import { useActiveContent } from "@/lib/useActiveContent";

const HOTEL_CATEGORIES = ["Exterior", "Interior", "Rooms", "Food", "Building"];
const RESTAURANT_CATEGORIES = ["Interior", "Food", "Ambience", "Bar", "Events"];

/**
 * Cross-vertical gallery.
 *
 * The gallery collection is per-property in the backend, so this page acts on
 * whichever property the business selector points at, using the same manager
 * the property workspaces use.
 */
export default function GalleryPage() {
  const { business } = useBusiness();
  const { gallery, loading, error, reload, basePath, ownerId, property } = useActiveContent();

  return (
    <RequireAdmin>
      <PageHeader
        title="Gallery"
        description="Photos shown in the public gallery, grouped by category."
        breadcrumbs={[{ label: "Gallery" }]}
      />

      <PropertyScopeNotice />

      {!property ? (
        <NoPropertyState what="A gallery" />
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <GalleryManager
          basePath={basePath}
          ownerId={ownerId}
          items={gallery}
          loading={loading}
          onChanged={reload}
          upload={business === "restaurant" ? uploadRestaurantImage : uploadImage}
          categoryOptions={business === "restaurant" ? RESTAURANT_CATEGORIES : HOTEL_CATEGORIES}
        />
      )}
    </RequireAdmin>
  );
}
