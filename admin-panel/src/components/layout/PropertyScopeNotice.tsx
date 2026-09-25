"use client";

import Link from "next/link";
import { Building2, Info, ShieldAlert } from "lucide-react";
import { BUSINESS_LABEL, useBusiness, type BusinessKey } from "@/lib/businessContext";
import { useAdminSession } from "@/lib/adminSession";
import { canAccessBusiness, managerVertical } from "@/lib/roles";
import { humanise } from "@/lib/format";
import { EmptyState } from "@/components/ui/States";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";

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

/**
 * True once the session is known and the signed-in role can't work in
 * `business`. Pages use it to show `OutOfScopeState` instead of an empty list
 * that would read as "there are no bookings".
 */
export function useIsOutOfScope(business: BusinessKey): boolean {
  const { admin, ready } = useAdminSession();
  return ready && Boolean(admin) && !canAccessBusiness(admin?.role, business);
}

/**
 * Shown in place of a vertical's operational list when the role doesn't cover
 * that vertical. Same shape as the Super-Admin-only explanation on Settings.
 * UX only — the API refuses these requests regardless.
 */
export function OutOfScopeState({ business, what }: { business: BusinessKey; what: string }) {
  const { admin } = useAdminSession();
  const own = managerVertical(admin?.role);

  return (
    <EmptyState
      icon={<ShieldAlert size={20} />}
      title="Not in your section"
      description={`This section belongs to the ${BUSINESS_LABEL[business]} team. ${
        own
          ? `As ${humanise(admin?.role ?? "")}, you manage the ${BUSINESS_LABEL[own]} only`
          : "Your role does not cover it"
      }, so ${what} are not shown here — the API refuses them for your role as well.`}
      action={
        <Link href="/" className="btn-secondary">
          Back to the dashboard
        </Link>
      }
    />
  );
}

/**
 * Route-segment guard for a vertical's property pages (`/hotels`, `/restaurants`,
 * `/halls` and everything under them), used from each segment's layout.tsx.
 * Without it a manager who typed another vertical's URL got that vertical's full
 * editor, every save of which the API then refused with 403. Rendering the
 * explanation instead also stops those pages from firing the refused requests.
 */
export function SectionScopeGuard({
  business,
  title,
  what,
  children,
}: {
  business: BusinessKey;
  title: string;
  what: string;
  children: React.ReactNode;
}) {
  const { ready } = useAdminSession();
  const outOfScope = useIsOutOfScope(business);
  // Until the session is known, show RequireAdmin's own loading state rather
  // than mounting the page (which would fire requests the API then refuses).
  if (!ready) return <RequireAdmin>{null}</RequireAdmin>;
  if (!outOfScope) return <>{children}</>;
  return (
    <RequireAdmin>
      <PageHeader title={title} breadcrumbs={[{ label: BUSINESS_LABEL[business] }]} />
      <OutOfScopeState business={business} what={what} />
    </RequireAdmin>
  );
}
