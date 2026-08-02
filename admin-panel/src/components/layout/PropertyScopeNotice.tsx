"use client";

import Link from "next/link";
import { Building2, Info } from "lucide-react";
import { BUSINESS_LABEL, useBusiness } from "@/lib/businessContext";
import { EmptyState } from "@/components/ui/States";

/**
 * Banner shown at the top of the cross-vertical content pages (Gallery, Offers,
 * FAQs), making it explicit which property they are editing and how to switch.
 *
 * The content collections are per-property in the backend, so a page that
 * silently edited "the first hotel" would be a trap the moment a second
 * property exists.
 */
export default function PropertyScopeNotice() {
  const { business, activeProperty, properties } = useBusiness();

  if (!activeProperty) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-white px-4 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
        <Building2 size={14} />
      </span>
      <p className="min-w-0 flex-1 text-base text-ink-600">
        Editing{" "}
        <span className="font-medium text-ink-800">{activeProperty.name}</span>
        <span className="text-ink-500"> · {BUSINESS_LABEL[business]}</span>
      </p>
      {properties.length > 1 && (
        <span className="text-sm text-ink-500">
          Switch property from the selector in the sidebar.
        </span>
      )}
      <Link
        href={
          business === "restaurant"
            ? `/restaurants/${activeProperty._id}`
            : business === "hall"
              ? `/halls/${activeProperty._id}`
              : `/hotels/${activeProperty._id}`
        }
        className="btn-ghost btn-sm"
      >
        Open property
      </Link>
    </div>
  );
}

/** Shown in place of a content manager when the selected vertical has no property. */
export function NoPropertyState({ what }: { what: string }) {
  const { business } = useBusiness();
  const href =
    business === "restaurant" ? "/restaurants" : business === "hall" ? "/halls" : "/hotels";

  return (
    <div className="card">
      <EmptyState
        icon={<Info size={19} />}
        title={`No ${BUSINESS_LABEL[business].toLowerCase()} property yet`}
        description={`${what} belongs to a property, so create one first.`}
        action={
          <Link href={href} className="btn-primary">
            Go to {BUSINESS_LABEL[business]}
          </Link>
        }
      />
    </div>
  );
}
