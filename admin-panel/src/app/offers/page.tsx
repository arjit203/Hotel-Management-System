"use client";

import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/States";
import OffersManager from "@/components/content/OffersManager";
import PropertyScopeNotice, { NoPropertyState } from "@/components/layout/PropertyScopeNotice";
import { useActiveContent } from "@/lib/useActiveContent";

/**
 * Cross-vertical offers.
 *
 * Offers are per-property, so this page acts on the property the business
 * selector points at. Only currently-valid offers are returned by the API —
 * the manager explains that where it matters.
 */
export default function OffersPage() {
  const { offers, loading, error, reload, basePath, ownerId, property } = useActiveContent();

  return (
    <RequireAdmin>
      <PageHeader
        title="Offers"
        description="Promotions shown on the public site while today falls inside their date range."
        breadcrumbs={[{ label: "Offers" }]}
      />

      <PropertyScopeNotice />

      {!property ? (
        <NoPropertyState what="An offer" />
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <OffersManager
          basePath={basePath}
          ownerId={ownerId}
          items={offers}
          loading={loading}
          onChanged={reload}
        />
      )}
    </RequireAdmin>
  );
}
