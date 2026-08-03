"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BedDouble,
  CheckCheck,
  CreditCard,
  PartyPopper,
  RefreshCw,
  Star,
  Undo2,
  UtensilsCrossed,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { SegmentedControl } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { dateTime, relativeTime } from "@/lib/format";
import { useNotifications } from "@/lib/notifications";
import type { ActivityModule, ActivityType } from "@/lib/console";

/**
 * The full notification list.
 *
 * Shares `NotificationProvider` with the header bell, so marking something read
 * here updates the badge without a refetch, and vice versa. There is no second
 * source of truth and no second poll.
 */

const ICON: Record<ActivityType, LucideIcon> = {
  booking_created: BedDouble,
  booking_cancelled: XCircle,
  payment_received: CreditCard,
  reservation_created: UtensilsCrossed,
  reservation_cancelled: XCircle,
  enquiry_created: PartyPopper,
  review_submitted: Star,
  offer_published: Star,
};

const MODULE_LABEL: Record<ActivityModule, string> = {
  hotel: "Hotel",
  restaurant: "Restaurant",
  hall: "Marriage Hall",
};

const TONE_CLASS = {
  info: "bg-info-50 text-info-600",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  brand: "bg-brand-50 text-brand-600",
} as const;

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const { items, unreadCount, loading, error, reload, markRead, markUnread, markAllRead } =
    useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [moduleFilter, setModuleFilter] = useState<ActivityModule | "all">("all");

  // Only offer module chips for verticals that actually appear — a hall
  // manager should not be shown a "Hotel" filter that can never match.
  const modules = useMemo(() => {
    const present = new Set(items.map((i) => i.module));
    return (["hotel", "restaurant", "hall"] as ActivityModule[]).filter((m) => present.has(m));
  }, [items]);

  const visible = items.filter(
    (i) =>
      (filter === "all" || !i.read) && (moduleFilter === "all" || i.module === moduleFilter)
  );

  return (
    <RequireAdmin>
      <div className="page-shell">
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Notifications" }]}
          title="Notifications"
          description="New bookings, reservations, hall enquiries, reviews and payments from the last 30 days."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => void reload()} disabled={loading}>
                <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                Refresh
              </Button>
              <Button onClick={() => void markAllRead()} disabled={unreadCount === 0}>
                <CheckCheck size={14} />
                Mark all read
              </Button>
            </div>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={[
              { value: "all", label: `All (${items.length})` },
              { value: "unread", label: `Unread (${unreadCount})` },
            ]}
          />

          {modules.length > 1 && (
            <div className="flex rounded-md border border-line p-0.5">
              <Chip active={moduleFilter === "all"} onClick={() => setModuleFilter("all")}>
                Everything
              </Chip>
              {modules.map((m) => (
                <Chip key={m} active={moduleFilter === m} onClick={() => setModuleFilter(m)}>
                  {MODULE_LABEL[m]}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <EmptyState
            icon={<Bell size={20} />}
            title="Could not load notifications"
            description={error}
            action={
              <Button variant="secondary" onClick={() => void reload()}>
                Try again
              </Button>
            }
          />
        ) : loading && items.length === 0 ? (
          <div className="card divide-y divide-line-subtle">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <span className="skeleton h-9 w-9 shrink-0 rounded-md" />
                <span className="flex-1 space-y-2">
                  <span className="skeleton block h-3.5 w-1/3 rounded" />
                  <span className="skeleton block h-3 w-2/3 rounded" />
                </span>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<CheckCheck size={20} />}
            title={filter === "unread" ? "Nothing unread" : "No notifications yet"}
            description={
              filter === "unread"
                ? "You have read everything from the last 30 days."
                : "Bookings, table reservations, hall enquiries and reviews appear here as they arrive."
            }
          />
        ) : (
          <ul className="card divide-y divide-line-subtle">
            {visible.map((n) => {
              const Icon = ICON[n.type] ?? Bell;
              return (
                <li
                  key={n.key}
                  className={cn(
                    "flex items-start gap-3 p-4 transition-colors",
                    !n.read && "bg-brand-50/40"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                      TONE_CLASS[n.tone]
                    )}
                  >
                    <Icon size={16} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link
                        href={n.href}
                        onClick={() => {
                          if (!n.read) void markRead(n.key);
                        }}
                        className={cn(
                          "text-base text-ink-800 hover:text-brand-700 hover:underline",
                          n.read ? "font-normal" : "font-semibold"
                        )}
                      >
                        {n.title}
                      </Link>
                      <span className="badge-neutral">{MODULE_LABEL[n.module]}</span>
                      {!n.read && <span className="badge-brand">New</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-600">{n.detail}</p>
                    <p className="mt-1 text-xs text-ink-400" title={dateTime(n.at)}>
                      {relativeTime(n.at)}
                    </p>
                  </div>

                  {/* Undo matters here in a way it does not in the dropdown: this
                      is the screen someone opens to triage, and mis-clicking
                      "read" on the one thing they meant to come back to should
                      not be permanent. */}
                  <button
                    onClick={() => (n.read ? void markUnread(n.key) : void markRead(n.key))}
                    className="btn-icon shrink-0"
                    aria-label={n.read ? "Mark as unread" : "Mark as read"}
                    title={n.read ? "Mark as unread" : "Mark as read"}
                  >
                    {n.read ? <Undo2 size={15} /> : <CheckCheck size={15} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-xs text-ink-500">
          Notifications are built from your bookings, reservations, enquiries and reviews rather
          than stored separately, so they always match the records themselves. Only the last 30 days
          are shown, and only for the businesses your role covers.
        </p>
      </div>
    </RequireAdmin>
  );
}

function Chip({
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
        "rounded px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-surface-muted"
      )}
    >
      {children}
    </button>
  );
}
