"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BedDouble,
  CreditCard,
  PartyPopper,
  RefreshCw,
  Star,
  Tag,
  UtensilsCrossed,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { relativeTime, dateTime } from "@/lib/format";
import { consoleApi, type ActivityItem, type ActivityModule, type ActivityType } from "@/lib/console";
import { EmptyState } from "@/components/ui/States";

/**
 * Cross-vertical activity, newest first.
 *
 * Every row links to the record that produced it — a booking reference opens
 * the bookings list filtered to that reference, an enquiry opens Enquiries, a
 * pending review opens the moderation queue. The link is the point: a timeline
 * you cannot act from is decoration.
 *
 * The server scopes the feed to the signed-in admin's verticals, so this
 * component never filters by role. The module chips filter what is *already*
 * permitted — a hall manager simply sees one chip.
 */

const ICON: Record<ActivityType, LucideIcon> = {
  booking_created: BedDouble,
  booking_cancelled: XCircle,
  payment_received: CreditCard,
  reservation_created: UtensilsCrossed,
  reservation_cancelled: XCircle,
  enquiry_created: PartyPopper,
  review_submitted: Star,
  offer_published: Tag,
};

const MODULE_LABEL: Record<ActivityModule, string> = {
  hotel: "Hotel",
  restaurant: "Restaurant",
  hall: "Marriage Hall",
};

const TONE_CLASS: Record<ActivityItem["tone"], string> = {
  info: "bg-info-50 text-info-600 ring-info-100",
  success: "bg-success-50 text-success-600 ring-success-100",
  warning: "bg-warning-50 text-warning-600 ring-warning-100",
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
};

export default function ActivityTimeline({ limit = 12 }: { limit?: number }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [scope, setScope] = useState<ActivityModule[]>([]);
  const [filter, setFilter] = useState<ActivityModule | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await consoleApi.activity({ limit: 40, days: 30 });
    setLoading(false);

    if (res.success && res.data) {
      setItems(res.data.items);
      setScope(res.data.scope);
      setError(null);
    } else {
      setError(res.message || "Could not load recent activity.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = (filter === "all" ? items : items.filter((i) => i.module === filter)).slice(
    0,
    limit
  );

  return (
    <section className="card">
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="card-title flex items-center gap-2">
            <Activity size={15} className="text-brand-600" />
            Recent activity
          </h2>
          <p className="card-subtitle">
            Bookings, reservations, enquiries, reviews and payments across the estate.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {scope.length > 1 && (
            <div className="flex rounded-md border border-line p-0.5">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                All
              </FilterChip>
              {scope.map((m) => (
                <FilterChip key={m} active={filter === m} onClick={() => setFilter(m)}>
                  {MODULE_LABEL[m]}
                </FilterChip>
              ))}
            </div>
          )}
          <button
            onClick={() => void load()}
            className="btn-icon"
            aria-label="Refresh activity"
            title="Refresh"
          >
            <RefreshCw size={15} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="card-body">
        {loading && items.length === 0 ? (
          <ul className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex gap-3">
                <span className="skeleton h-8 w-8 shrink-0 rounded-md" />
                <span className="flex-1 space-y-1.5">
                  <span className="skeleton block h-3.5 w-2/5 rounded" />
                  <span className="skeleton block h-3 w-3/5 rounded" />
                </span>
              </li>
            ))}
          </ul>
        ) : error ? (
          <EmptyState
            icon={<Activity size={20} />}
            title="Could not load activity"
            description={error}
            action={
              <button onClick={() => void load()} className="btn-outline">
                Try again
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Activity size={20} />}
            title="Nothing in the last 30 days"
            description="New bookings, table reservations, hall enquiries and reviews will appear here as they come in."
          />
        ) : (
          <ol className="relative space-y-0.5">
            {visible.map((item, index) => {
              const Icon = ICON[item.type] ?? Activity;
              const isLast = index === visible.length - 1;

              return (
                <li key={item.key} className="relative">
                  {/* The rail stops at the last item so it doesn't dangle. */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-4 top-9 h-[calc(100%-1.25rem)] w-px bg-line"
                    />
                  )}

                  <Link
                    href={item.href}
                    className="group relative flex gap-3 rounded-md px-1.5 py-2 transition-colors hover:bg-surface-muted"
                  >
                    <span
                      className={cn(
                        "z-[1] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-4 ring-white",
                        TONE_CLASS[item.tone]
                      )}
                    >
                      <Icon size={15} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-base font-medium text-ink-800 group-hover:text-brand-700">
                          {item.title}
                        </span>
                        <span className="badge-neutral">{MODULE_LABEL[item.module]}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-600">{item.detail}</span>
                      <span className="mt-0.5 block text-xs text-ink-400" title={dateTime(item.at)}>
                        {relativeTime(item.at)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded px-2 py-1 text-xs font-medium transition-colors",
        active ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-surface-muted"
      )}
    >
      {children}
    </button>
  );
}
