"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BedDouble, Star, UtensilsCrossed } from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { SegmentedControl } from "@/components/ui/Tabs";
import { ErrorState, Skeleton } from "@/components/ui/States";
import ReviewsManager from "@/components/content/ReviewsManager";
import { NoPropertyState } from "@/components/layout/PropertyScopeNotice";
import { useBusiness } from "@/lib/businessContext";
import { useSummary } from "@/lib/summary";

type Source = "hotel" | "restaurant";

/**
 * Cross-vertical review moderation.
 *
 * Reviews live in the shared polymorphic Review model, but the approve / reply /
 * delete routes are namespaced per vertical, so this page switches base path
 * with the source toggle rather than trying to mix both in one list.
 */
/**
 * useSearchParams() forces client-side rendering, so Next requires a Suspense
 * boundary above it for this route to build.
 */
export default function ReviewsPage() {
  return (
    <Suspense fallback={<ReviewsFallback />}>
      <ReviewsView />
    </Suspense>
  );
}

function ReviewsFallback() {
  return (
    <RequireAdmin>
      <PageHeader title="Reviews" loading breadcrumbs={[{ label: "Reviews" }]} />
      <div className="card p-5">
        <Skeleton className="h-28 w-full" />
      </div>
    </RequireAdmin>
  );
}

function ReviewsView() {
  const searchParams = useSearchParams();
  const { business, hotels, restaurants } = useBusiness();
  const { hotelReviews, restaurantReviews, loading, error, reload } = useSummary();

  const [source, setSource] = useState<Source>(business === "restaurant" ? "restaurant" : "hotel");

  // Follow the sidebar's business selector when it changes.
  useEffect(() => {
    if (business === "hotel" || business === "restaurant") setSource(business);
  }, [business]);

  const items = source === "restaurant" ? restaurantReviews : hotelReviews;
  const hasProperty = source === "restaurant" ? restaurants.length > 0 : hotels.length > 0;

  const stats = useMemo(() => {
    const all = [...hotelReviews, ...restaurantReviews];
    const approved = all.filter((r) => r.isApproved);
    return {
      total: all.length,
      pending: all.filter((r) => !r.isApproved).length,
      average:
        approved.length > 0
          ? (approved.reduce((sum, r) => sum + r.rating, 0) / approved.length).toFixed(1)
          : "—",
      unanswered: approved.filter((r) => !r.adminReply).length,
    };
  }, [hotelReviews, restaurantReviews]);

  // `?status=pending` from the dashboard/notification tray is handled by the
  // manager's own filter; surface it here so the page opens on the queue.
  const initiallyPending = searchParams.get("status") === "pending";

  return (
    <RequireAdmin>
      <PageHeader
        title="Reviews"
        description={
          initiallyPending
            ? "Reviews stay hidden on the public site until you approve them."
            : "Approve, reply to and remove guest reviews across both verticals."
        }
        breadcrumbs={[{ label: "Reviews" }]}
        actions={
          <SegmentedControl<Source>
            value={source}
            onChange={setSource}
            options={[
              { value: "hotel", label: "Hotel", icon: <BedDouble size={13} /> },
              { value: "restaurant", label: "Restaurant", icon: <UtensilsCrossed size={13} /> },
            ]}
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total reviews"
          value={stats.total}
          hint="Both verticals"
          icon={<Star size={15} />}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Awaiting approval"
          value={stats.pending}
          hint="Not visible publicly"
          tone={stats.pending > 0 ? "warning" : "neutral"}
          loading={loading}
        />
        <StatCard
          label="Average rating"
          value={stats.average}
          hint="Approved reviews only"
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Without a reply"
          value={stats.unanswered}
          hint="Approved but unanswered"
          loading={loading}
        />
      </div>

      {!hasProperty ? (
        <NoPropertyState what="Reviews" />
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <ReviewsManager
          key={source}
          basePath={source === "restaurant" ? "/admin/restaurants" : "/admin/hotels"}
          items={items}
          loading={loading}
          onChanged={reload}
          // Only the Hotel module exposes a remove-review-image route.
          canRemoveImages={source === "hotel"}
        />
      )}
    </RequireAdmin>
  );
}
