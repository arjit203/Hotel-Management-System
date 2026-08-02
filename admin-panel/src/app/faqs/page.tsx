"use client";

import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/States";
import FaqManager from "@/components/content/FaqManager";
import PropertyScopeNotice, { NoPropertyState } from "@/components/layout/PropertyScopeNotice";
import { useActiveContent } from "@/lib/useActiveContent";

/** Cross-vertical FAQs, scoped to the property the business selector points at. */
export default function FaqsPage() {
  const { faqs, loading, error, reload, basePath, ownerId, property } = useActiveContent();

  return (
    <RequireAdmin>
      <PageHeader
        title="FAQs"
        description="Answers shown on the public property page."
        breadcrumbs={[{ label: "FAQs" }]}
      />

      <PropertyScopeNotice />

      {!property ? (
        <NoPropertyState what="An FAQ" />
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <FaqManager
          basePath={basePath}
          ownerId={ownerId}
          items={faqs}
          loading={loading}
          onChanged={reload}
        />
      )}
    </RequireAdmin>
  );
}
