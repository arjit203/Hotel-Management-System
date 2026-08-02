"use client";

import Link from "next/link";
import { ArrowRight, BedDouble, CalendarCheck, Lock, PartyPopper, UtensilsCrossed } from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";

/**
 * Marriage Hall placeholder.
 *
 * The vertical is in the roadmap but has no backend module — there is no
 * `/api/v1/admin/halls` router, no Hall model and no hall booking flow. This
 * page exists so the sidebar entry leads somewhere honest instead of a 404,
 * and so the differences from Hotel are recorded before anyone builds it.
 */
export default function HallsPage() {
  return (
    <RequireAdmin>
      <PageHeader
        title="Marriage Hall"
        description="Planned third vertical. Not yet built."
        breadcrumbs={[{ label: "Marriage Hall" }]}
        meta={<Badge tone="neutral" icon={<Lock size={11} />}>Coming soon</Badge>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <PartyPopper size={24} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink-900">
            The Marriage Hall module hasn&apos;t been built yet
          </h2>
          <p className="mt-1.5 max-w-lg text-base text-ink-600">
            Hotel and Restaurant are live. Hall management will appear here once the backend module
            exists — the console already reserves its place in the sidebar and the business
            selector.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/hotels" className="btn-secondary">
              <BedDouble size={14} />
              Go to Hotel
            </Link>
            <Link href="/restaurants" className="btn-secondary">
              <UtensilsCrossed size={14} />
              Go to Restaurant
            </Link>
          </div>
        </div>

        <div className="border-t border-line bg-surface-hover px-6 py-5">
          <h3 className="text-sm font-semibold text-ink-800">
            What will be different from Hotel
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            <Difference
              icon={<CalendarCheck size={15} />}
              title="Approval before payment"
              detail="A hall enquiry is reviewed by an admin first. Hotel bookings confirm instantly on payment; hall bookings must not copy that flow."
            />
            <Difference
              icon={<PartyPopper size={15} />}
              title="Shared content, not new models"
              detail="Gallery, reviews, FAQs and offers reuse the existing polymorphic content module with a hall owner type — no per-vertical copies."
            />
          </ul>
          <p className="mt-4 flex items-center gap-1.5 text-sm text-ink-500">
            Hotel and Restaurant admin are complete and verified first, by design.
            <ArrowRight size={13} />
          </p>
        </div>
      </div>
    </RequireAdmin>
  );
}

function Difference({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex gap-2.5 rounded-lg border border-line bg-white p-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-ink-600">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-medium text-ink-800">{title}</span>
        <span className="block text-sm text-ink-600">{detail}</span>
      </span>
    </li>
  );
}
