"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, IndianRupee, TrendingUp, Users } from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { SegmentedControl } from "@/components/ui/Tabs";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useSummary } from "@/lib/summary";
import { currency, humanise } from "@/lib/format";

type Range = "30" | "90" | "365";

const RANGE_LABEL: Record<Range, string> = {
  "30": "Last 30 days",
  "90": "Last 90 days",
  "365": "Last 12 months",
};

/**
 * Chart palette — drawn from the admin design tokens so the charts read as part
 * of the same system rather than a bolted-on library default.
 */
const SERIES = {
  revenue: "#4f46e5",
  bookings: "#12b76a",
  reservations: "#2e90fa",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f79009",
  confirmed: "#12b76a",
  checked_in: "#2e90fa",
  checked_out: "#98a2b3",
  completed: "#027a48",
  cancelled: "#f04438",
  refund_pending: "#dc6803",
  refunded: "#667085",
  seated: "#2e90fa",
  no_show: "#d92d20",
};

const REVENUE_STATUSES = new Set(["confirmed", "checked_in", "checked_out", "completed"]);

/**
 * Analytics over the data the admin API already returns.
 *
 * There is no reporting endpoint in this backend, so every series is computed
 * client-side from the full booking and reservation lists. That is accurate at
 * the current data volume; if these lists ever grow past a few thousand rows,
 * the right fix is a server-side aggregate route, not more work here.
 */
export default function AnalyticsPage() {
  const { bookings, reservations, hotelReviews, restaurantReviews, loading } = useSummary();
  const [range, setRange] = useState<Range>("90");

  const days = Number(range);
  const since = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days);
    return d.getTime();
  }, [days]);

  /** Group by day for short ranges, by month for the 12-month view. */
  const groupByMonth = days > 120;

  const timeSeries = useMemo(() => {
    const buckets = new Map<string, { label: string; revenue: number; bookings: number; reservations: number }>();

    function bucketKey(date: Date): { key: string; label: string } {
      if (groupByMonth) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return { key, label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) };
      }
      const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) };
    }

    // Pre-seed every bucket so gaps render as zero rather than collapsing the axis.
    const cursor = new Date(since);
    const end = new Date();
    while (cursor <= end) {
      const { key, label } = bucketKey(cursor);
      if (!buckets.has(key)) buckets.set(key, { label, revenue: 0, bookings: 0, reservations: 0 });
      if (groupByMonth) cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }

    for (const b of bookings) {
      const when = new Date(b.createdAt || b.checkInDate);
      if (Number.isNaN(when.getTime()) || when.getTime() < since) continue;
      const { key, label } = bucketKey(when);
      const bucket = buckets.get(key) ?? { label, revenue: 0, bookings: 0, reservations: 0 };
      bucket.bookings += 1;
      if (REVENUE_STATUSES.has(b.status)) bucket.revenue += b.totalAmount || 0;
      buckets.set(key, bucket);
    }

    for (const r of reservations) {
      const when = new Date(r.createdAt || r.reservationDate);
      if (Number.isNaN(when.getTime()) || when.getTime() < since) continue;
      const { key, label } = bucketKey(when);
      const bucket = buckets.get(key) ?? { label, revenue: 0, bookings: 0, reservations: 0 };
      bucket.reservations += 1;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [bookings, reservations, since, groupByMonth]);

  const bookingStatusMix = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => (counts[b.status] = (counts[b.status] ?? 0) + 1));
    return Object.entries(counts)
      .map(([status, value]) => ({ name: humanise(status), value, status }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  const areaMix = useMemo(() => {
    const counts: Record<string, number> = {};
    reservations.forEach((r) => {
      if (r.status === "cancelled") return;
      counts[r.diningAreaName] = (counts[r.diningAreaName] ?? 0) + (r.partySize || 0);
    });
    return Object.entries(counts)
      .map(([name, covers]) => ({ name, covers }))
      .sort((a, b) => b.covers - a.covers)
      .slice(0, 8);
  }, [reservations]);

  const totals = useMemo(() => {
    const inRange = bookings.filter((b) => {
      const when = new Date(b.createdAt || b.checkInDate).getTime();
      return !Number.isNaN(when) && when >= since;
    });
    const revenue = inRange
      .filter((b) => REVENUE_STATUSES.has(b.status))
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const paidCount = inRange.filter((b) => REVENUE_STATUSES.has(b.status)).length;

    const reservationsInRange = reservations.filter((r) => {
      const when = new Date(r.createdAt || r.reservationDate).getTime();
      return !Number.isNaN(when) && when >= since;
    });

    const allReviews = [...hotelReviews, ...restaurantReviews].filter((r) => r.isApproved);

    return {
      revenue,
      bookings: inRange.length,
      averageBooking: paidCount > 0 ? revenue / paidCount : 0,
      covers: reservationsInRange
        .filter((r) => r.status !== "cancelled")
        .reduce((sum, r) => sum + (r.partySize || 0), 0),
      cancellationRate:
        inRange.length > 0
          ? (inRange.filter((b) => b.status === "cancelled").length / inRange.length) * 100
          : 0,
      averageRating:
        allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
          : null,
    };
  }, [bookings, reservations, hotelReviews, restaurantReviews, since]);

  const hasData = bookings.length > 0 || reservations.length > 0;

  return (
    <RequireAdmin>
      <PageHeader
        title="Analytics"
        description="Computed from booking and reservation records — there is no separate reporting store."
        breadcrumbs={[{ label: "Analytics" }]}
        actions={
          <SegmentedControl<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: "30", label: "30d" },
              { value: "90", label: "90d" },
              { value: "365", label: "12m" },
            ]}
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`Revenue · ${RANGE_LABEL[range].toLowerCase()}`}
          value={currency(totals.revenue)}
          hint="Confirmed and completed stays"
          icon={<IndianRupee size={15} />}
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Bookings created"
          value={totals.bookings}
          hint={`Avg ${currency(totals.averageBooking)} each`}
          icon={<TrendingUp size={15} />}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Restaurant covers"
          value={totals.covers}
          hint="Guests seated or expected"
          icon={<Users size={15} />}
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Cancellation rate"
          value={`${totals.cancellationRate.toFixed(1)}%`}
          hint={
            totals.averageRating !== null
              ? `Avg rating ${totals.averageRating.toFixed(1)}/5`
              : "No approved reviews yet"
          }
          icon={<BarChart3 size={15} />}
          tone={totals.cancellationRate > 20 ? "warning" : "neutral"}
          loading={loading}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : !hasData ? (
        <div className="card">
          <EmptyState
            icon={<BarChart3 size={19} />}
            title="Nothing to chart yet"
            description="Once bookings and reservations start arriving, trends appear here."
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Revenue trend</h2>
                <p className="card-subtitle">
                  Booking value by {groupByMonth ? "month" : "day"} created · {RANGE_LABEL[range]}
                </p>
              </div>
            </div>
            <div className="card-body">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES.revenue} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={SERIES.revenue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eef0f3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#667085" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e4e7ec" }}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#667085" }}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                      tickFormatter={(v: number) => currency(v)}
                    />
                    <Tooltip
                      formatter={(v: number) => [currency(v), "Revenue"]}
                      contentStyle={tooltipStyle}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={SERIES.revenue}
                      strokeWidth={2}
                      fill="url(#revenueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Volume</h2>
                <p className="card-subtitle">Bookings and table reservations created</p>
              </div>
            </div>
            <div className="card-body">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeries} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="#eef0f3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#667085" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e4e7ec" }}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#667085" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={40}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="bookings"
                      name="Hotel bookings"
                      fill={SERIES.bookings}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="reservations"
                      name="Table reservations"
                      fill={SERIES.reservations}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={26}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Booking status mix</h2>
                  <p className="card-subtitle">All bookings, not just this range</p>
                </div>
              </div>
              <div className="card-body">
                {bookingStatusMix.length === 0 ? (
                  <EmptyState compact title="No bookings yet" />
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bookingStatusMix}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={48}
                          outerRadius={78}
                          paddingAngle={2}
                        >
                          {bookingStatusMix.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={STATUS_COLORS[entry.status] || "#98a2b3"}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Covers by dining area</h2>
                  <p className="card-subtitle">Guests seated, excluding cancellations</p>
                </div>
              </div>
              <div className="card-body">
                {areaMix.length === 0 ? (
                  <EmptyState compact title="No reservations yet" />
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={areaMix}
                        layout="vertical"
                        margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
                      >
                        <CartesianGrid stroke="#eef0f3" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12, fill: "#667085" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e4e7ec" }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#667085" }}
                          tickLine={false}
                          axisLine={false}
                          width={110}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar
                          dataKey="covers"
                          name="Covers"
                          fill={SERIES.reservations}
                          radius={[0, 3, 3, 0]}
                          maxBarSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </RequireAdmin>
  );
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid #e4e7ec",
  boxShadow: "0 4px 8px -2px rgb(16 24 40 / 0.08)",
  fontSize: 13,
};
