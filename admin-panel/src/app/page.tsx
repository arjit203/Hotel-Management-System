"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  CalendarClock,
  IndianRupee,
  Image as ImageIcon,
  PartyPopper,
  Star,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useAdminSession } from "@/lib/adminSession";
import { useBusiness } from "@/lib/businessContext";
import { useSummary } from "@/lib/summary";
import { currency, dayMonth, isToday, relativeTime, timeSlotLabel } from "@/lib/format";

/**
 * Operational overview across both verticals.
 *
 * Every figure is computed from the lists SummaryProvider already holds — the
 * backend has no analytics/stats endpoint and this redesign does not add one.
 */
export default function AdminDashboardPage() {
  const { admin } = useAdminSession();
  const { hotels, restaurants, loading: propertiesLoading } = useBusiness();
  const { bookings, reservations, hotelReviews, restaurantReviews, content, stats, loading } =
    useSummary();

  const todaysArrivals = useMemo(
    () =>
      bookings
        .filter((b) => isToday(b.checkInDate) && !["cancelled", "refunded"].includes(b.status))
        .slice(0, 5),
    [bookings]
  );

  const todaysCovers = useMemo(
    () =>
      reservations
        .filter((r) => isToday(r.reservationDate) && r.status !== "cancelled")
        .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
        .slice(0, 5),
    [reservations]
  );

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.checkInDate).getTime() -
            new Date(a.createdAt || a.checkInDate).getTime()
        )
        .slice(0, 6),
    [bookings]
  );

  const pendingReviewList = useMemo(
    () => [...hotelReviews, ...restaurantReviews].filter((r) => !r.isApproved).slice(0, 4),
    [hotelReviews, restaurantReviews]
  );

  const firstName = admin?.name?.split(" ")[0] || "there";

  return (
    <RequireAdmin>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Everything that needs attention across Hotel and Restaurant, in one place."
      />

      {/* Primary operational counters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today's check-ins"
          value={stats.todaysCheckIns}
          hint="Hotel arrivals"
          icon={<BedDouble size={15} />}
          tone="brand"
          href="/bookings?window=today"
          loading={loading}
        />
        <StatCard
          label="Today's reservations"
          value={stats.todaysReservations}
          hint="Restaurant covers"
          icon={<UtensilsCrossed size={15} />}
          tone="info"
          href="/reservations?window=today"
          loading={loading}
        />
        <StatCard
          label="Awaiting payment"
          value={stats.pendingBookings}
          hint="Rooms are not held yet"
          icon={<CalendarClock size={15} />}
          tone={stats.pendingBookings > 0 ? "warning" : "neutral"}
          href="/bookings?status=pending"
          loading={loading}
        />
        <StatCard
          label="Reviews to moderate"
          value={stats.pendingReviews}
          hint="Hidden until approved"
          icon={<Star size={15} />}
          tone={stats.pendingReviews > 0 ? "warning" : "neutral"}
          href="/reviews?status=pending"
          loading={loading}
        />
      </div>

      {/* Revenue + content inventory */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Confirmed revenue"
          value={currency(stats.confirmedRevenue)}
          hint="All confirmed and completed stays"
          icon={<IndianRupee size={15} />}
          tone="success"
          href="/analytics"
          loading={loading}
        />
        <StatCard
          label="Booked this month"
          value={currency(stats.monthRevenue)}
          hint="By booking creation date"
          icon={<IndianRupee size={15} />}
          tone="success"
          href="/analytics"
          loading={loading}
        />
        <StatCard
          label="Live offers"
          value={content.offers}
          hint="Currently visible publicly"
          icon={<Tag size={15} />}
          href="/offers"
          loading={loading}
        />
        <StatCard
          label="Gallery images"
          value={content.gallery}
          hint="Across all properties"
          icon={<ImageIcon size={15} />}
          href="/gallery"
          loading={loading}
        />
      </div>

      {/* Business cards */}
      <h2 className="mb-3 mt-7 text-md font-semibold text-ink-800">Your businesses</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <BusinessCard
          title="Hotel"
          href="/hotels"
          icon={<BedDouble size={17} />}
          summary={
            propertiesLoading
              ? "Loading…"
              : `${hotels.length} ${hotels.length === 1 ? "property" : "properties"} · ${content.rooms} room types`
          }
          description="Rooms, availability, gallery, offers, FAQs and bookings."
        />
        <BusinessCard
          title="Restaurant"
          href="/restaurants"
          icon={<UtensilsCrossed size={17} />}
          summary={
            propertiesLoading
              ? "Loading…"
              : `${restaurants.length} ${restaurants.length === 1 ? "property" : "properties"} · ${content.menuItems} dishes`
          }
          description="Menu, dining areas, table reservations, gallery and reviews."
        />
        <BusinessCard
          title="Marriage Hall"
          href="/halls"
          icon={<PartyPopper size={17} />}
          summary="Not started"
          description="Planned vertical. Bookings there need admin approval before payment — unlike Hotel, which is instant."
          disabled
        />
      </div>

      {/* Today's operations */}
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Arrivals today</h2>
              <p className="card-subtitle">Hotel guests checking in</p>
            </div>
            <Link href="/bookings?window=today" className="btn-ghost btn-sm">
              View all
              <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : todaysArrivals.length === 0 ? (
            <EmptyState
              compact
              icon={<BedDouble size={18} />}
              title="No arrivals today"
              description="Nothing is scheduled to check in."
            />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {todaysArrivals.map((b) => (
                <li key={b._id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-ink-800">{b.guestName}</p>
                    <p className="truncate text-xs text-ink-500">
                      {b.bookingReference} · out {dayMonth(b.checkOutDate)}
                    </p>
                  </div>
                  <span className="hidden text-base tabular-nums text-ink-600 sm:inline">
                    {currency(b.totalAmount)}
                  </span>
                  <Badge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Covers today</h2>
              <p className="card-subtitle">Restaurant table reservations</p>
            </div>
            <Link href="/reservations?window=today" className="btn-ghost btn-sm">
              View all
              <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : todaysCovers.length === 0 ? (
            <EmptyState
              compact
              icon={<UtensilsCrossed size={18} />}
              title="No covers today"
              description="No tables are reserved for today."
            />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {todaysCovers.map((r) => (
                <li key={r._id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-ink-700">
                    {timeSlotLabel(r.timeSlot)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-ink-800">{r.guestName}</p>
                    <p className="truncate text-xs text-ink-500">
                      {r.diningAreaName} · party of {r.partySize}
                    </p>
                  </div>
                  <Badge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Latest bookings</h2>
              <p className="card-subtitle">Newest first</p>
            </div>
            <Link href="/bookings" className="btn-ghost btn-sm">
              All bookings
              <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : recentBookings.length === 0 ? (
            <EmptyState
              compact
              icon={<CalendarCheck size={18} />}
              title="No bookings yet"
              description="Bookings made on the public site appear here."
            />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {recentBookings.map((b) => (
                <li key={b._id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-ink-800">
                      {b.guestName}
                      <span className="ml-2 font-mono text-xs font-normal text-ink-500">
                        {b.bookingReference}
                      </span>
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {dayMonth(b.checkInDate)} → {dayMonth(b.checkOutDate)} ·{" "}
                      {relativeTime(b.createdAt)}
                    </p>
                  </div>
                  <span className="hidden text-base tabular-nums text-ink-600 sm:inline">
                    {currency(b.totalAmount)}
                  </span>
                  <Badge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Reviews awaiting approval</h2>
              <p className="card-subtitle">Not shown publicly until approved</p>
            </div>
            <Link href="/reviews?status=pending" className="btn-ghost btn-sm">
              Moderate
              <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : pendingReviewList.length === 0 ? (
            <EmptyState
              compact
              icon={<Star size={18} />}
              title="Nothing to moderate"
              description="Every review has been actioned."
            />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {pendingReviewList.map((r) => (
                <li key={r._id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-ink-800">
                      {r.guestName || "Guest"}
                    </span>
                    <span
                      className="text-warning-600"
                      aria-label={`Rated ${r.rating} out of 5`}
                      title={`${r.rating}/5`}
                    >
                      {"★".repeat(r.rating)}
                      <span className="text-ink-300">{"★".repeat(5 - r.rating)}</span>
                    </span>
                    <Badge tone="neutral" className="ml-auto">
                      {r.source === "restaurant" ? "Restaurant" : "Hotel"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-600">{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </RequireAdmin>
  );
}

// ------------------------------------------------------------------ helpers

function ListSkeleton() {
  return (
    <div className="divide-y divide-line-subtle" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-1.5 h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function BusinessCard({
  title,
  href,
  icon,
  summary,
  description,
  disabled,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  summary: string;
  description: string;
  disabled?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span
          className={
            disabled
              ? "flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-ink-400"
              : "flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
          }
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink-800">{title}</p>
          <p className="text-xs text-ink-500">{summary}</p>
        </div>
        {disabled && <span className="badge-neutral ml-auto">Soon</span>}
      </div>
      <p className="mt-3 text-sm text-ink-600">{description}</p>
    </>
  );

  if (disabled) return <div className="card p-4 opacity-75">{body}</div>;

  return (
    <Link href={href} className="card block p-4 transition-shadow hover:shadow-md">
      {body}
    </Link>
  );
}
