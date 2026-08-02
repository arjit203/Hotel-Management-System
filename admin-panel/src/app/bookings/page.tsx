"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  IndianRupee,
  LogIn,
  LogOut,
  XCircle,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminApi, formatApiError } from "@/lib/api";
import { useSummary, type HotelBookingSummary } from "@/lib/summary";
import { currency, dateTime, humanise, isToday, nightsBetween, shortDate } from "@/lib/format";

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled",
  "refund_pending",
  "refunded",
];

type WindowFilter = "all" | "today" | "upcoming" | "past";

/**
 * Hotel booking book.
 *
 * Reads `GET /admin/hotels/bookings` (through the shared summary cache) and
 * writes only via `PUT /admin/hotels/bookings/:id/status`, exactly as before.
 * Status transitions are not validated client-side — the backend owns that
 * rule — but destructive ones ask for confirmation first.
 */
/**
 * useSearchParams() forces client-side rendering, so Next requires a Suspense
 * boundary above it for this route to build. The inner component holds all the
 * real work.
 */
export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<BookingsFallback />}>
      <BookingsView />
    </Suspense>
  );
}

function BookingsFallback() {
  return (
    <RequireAdmin>
      <PageHeader title="Hotel bookings" loading breadcrumbs={[{ label: "Bookings" }]} />
      <div className="card">
        <TableSkeleton rows={8} cols={5} />
      </div>
    </RequireAdmin>
  );
}

function BookingsView() {
  const searchParams = useSearchParams();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { bookings, loading, error, reload } = useSummary();

  const [statusFilter, setStatusFilter] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("all");
  const [selected, setSelected] = useState<HotelBookingSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Deep links from the dashboard / notification tray preset the filters.
  useEffect(() => {
    const status = searchParams.get("status");
    if (status && STATUS_OPTIONS.includes(status)) setStatusFilter(status);

    const windowParam = searchParams.get("window");
    if (windowParam === "today" || windowParam === "upcoming" || windowParam === "past") {
      setWindowFilter(windowParam);
    }
  }, [searchParams]);

  // A booking reference passed from the command palette opens that record.
  const refParam = searchParams.get("ref");
  useEffect(() => {
    if (!refParam || bookings.length === 0) return;
    const match = bookings.find((b) => b.bookingReference === refParam);
    if (match) setSelected(match);
  }, [refParam, bookings]);

  const rows = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return bookings.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;

      if (windowFilter === "today") return isToday(b.checkInDate);
      if (windowFilter === "upcoming")
        return new Date(b.checkInDate).getTime() >= startOfToday.getTime();
      if (windowFilter === "past")
        return new Date(b.checkOutDate).getTime() < startOfToday.getTime();
      return true;
    });
  }, [bookings, statusFilter, windowFilter]);

  const stats = useMemo(() => {
    const relevant = rows;
    return {
      total: relevant.length,
      pending: relevant.filter((b) => b.status === "pending").length,
      arrivals: relevant.filter((b) => isToday(b.checkInDate)).length,
      value: relevant
        .filter((b) => !["cancelled", "refunded"].includes(b.status))
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    };
  }, [rows]);

  const updateStatus = useCallback(
    async (booking: HotelBookingSummary, status: string) => {
      if (status === booking.status) return;

      if (["cancelled", "refunded", "refund_pending"].includes(status)) {
        const ok = await confirm({
          title: `Mark ${booking.bookingReference} as ${humanise(status).toLowerCase()}?`,
          description:
            "This changes the booking status only. It does not trigger a Razorpay refund — guest-initiated cancellation is the flow that refunds.",
          confirmLabel: `Set ${humanise(status).toLowerCase()}`,
          danger: true,
        });
        if (!ok) return;
      }

      setBusyId(booking._id);
      const res = await adminApi.put(`/admin/hotels/bookings/${booking._id}/status`, { status });
      setBusyId(null);

      if (!res.success) {
        toastError(formatApiError(res));
        return;
      }

      toastSuccess(`${booking.bookingReference} → ${humanise(status).toLowerCase()}.`);
      setSelected((prev) => (prev && prev._id === booking._id ? { ...prev, status } : prev));
      reload();
    },
    [confirm, reload, toastError, toastSuccess]
  );

  async function bulkUpdate(list: HotelBookingSummary[], status: string, clear: () => void) {
    const ok = await confirm({
      title: `Set ${list.length} booking${list.length === 1 ? "" : "s"} to ${humanise(status).toLowerCase()}?`,
      description: "Each booking is updated individually; any that the API rejects are reported.",
      confirmLabel: "Update",
      danger: ["cancelled", "refunded"].includes(status),
    });
    if (!ok) return;

    let failures = 0;
    for (const booking of list) {
      const res = await adminApi.put(`/admin/hotels/bookings/${booking._id}/status`, { status });
      if (!res.success) failures += 1;
    }

    clear();
    if (failures > 0) toastError(`${failures} booking(s) could not be updated.`);
    else toastSuccess(`${list.length} booking(s) updated.`);
    reload();
  }

  function copyReference(reference: string) {
    void navigator.clipboard?.writeText(reference);
    toastSuccess("Booking reference copied.");
  }

  const columns: Column<HotelBookingSummary>[] = [
    {
      key: "reference",
      header: "Reference",
      sortable: true,
      accessor: (b) => b.bookingReference,
      render: (b) => (
        <button
          onClick={() => setSelected(b)}
          className="font-mono text-sm font-medium text-brand-700 hover:underline"
        >
          {b.bookingReference}
        </button>
      ),
    },
    {
      key: "guest",
      header: "Guest",
      sortable: true,
      accessor: (b) => b.guestName,
      render: (b) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-800">{b.guestName}</p>
          <p className="truncate text-xs text-ink-500">{b.guestEmail}</p>
        </div>
      ),
    },
    {
      key: "stay",
      header: "Stay",
      sortable: true,
      accessor: (b) => new Date(b.checkInDate).getTime(),
      hideBelow: "md",
      render: (b) => {
        const nights = nightsBetween(b.checkInDate, b.checkOutDate);
        return (
          <div className="min-w-0 whitespace-nowrap">
            <p className="text-ink-700">
              {shortDate(b.checkInDate)} → {shortDate(b.checkOutDate)}
            </p>
            <p className="text-xs text-ink-500">
              {nights} night{nights === 1 ? "" : "s"}
              {b.rooms?.length ? ` · ${b.rooms.length} room type(s)` : ""}
            </p>
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      accessor: (b) => b.totalAmount,
      align: "right",
      hideBelow: "sm",
      render: (b) => (
        <div className="whitespace-nowrap">
          <p className="tabular-nums text-ink-800">{currency(b.totalAmount)}</p>
          {b.paymentStatus && (
            <p className="text-xs capitalize text-ink-500">{b.paymentStatus.replace(/_/g, " ")}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (b) => b.status,
      render: (b) => (
        <select
          value={b.status}
          disabled={busyId === b._id}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => void updateStatus(b, e.target.value)}
          aria-label={`Status for ${b.bookingReference}`}
          className="input w-auto min-w-[8.5rem] py-1 text-sm capitalize"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {humanise(s)}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <RequireAdmin>
      <PageHeader
        title="Hotel bookings"
        description="Every room booking, newest activity first. Status changes take effect immediately."
        breadcrumbs={[{ label: "Bookings" }]}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Bookings in view"
          value={stats.total}
          icon={<CalendarCheck size={15} />}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Awaiting payment"
          value={stats.pending}
          hint="Rooms are not held"
          icon={<CalendarClock size={15} />}
          tone={stats.pending > 0 ? "warning" : "neutral"}
          loading={loading}
        />
        <StatCard
          label="Arriving today"
          value={stats.arrivals}
          icon={<LogIn size={15} />}
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Value in view"
          value={currency(stats.value)}
          hint="Excludes cancelled and refunded"
          icon={<IndianRupee size={15} />}
          tone="success"
          loading={loading}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b._id}
        loading={loading}
        error={error}
        onRetry={reload}
        pageSize={15}
        searchable={(b) => `${b.bookingReference} ${b.guestName} ${b.guestEmail} ${b.guestPhone || ""}`}
        searchPlaceholder="Search reference, guest, email…"
        initialSort={{ key: "stay", direction: "desc" }}
        toolbar={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="input w-auto py-1.5"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {humanise(s)}
                </option>
              ))}
            </select>
            <select
              value={windowFilter}
              onChange={(e) => setWindowFilter(e.target.value as WindowFilter)}
              aria-label="Filter by date window"
              className="input w-auto py-1.5"
            >
              <option value="all">Any date</option>
              <option value="today">Arriving today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past stays</option>
            </select>
            {(statusFilter || windowFilter !== "all") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusFilter("");
                  setWindowFilter("all");
                }}
              >
                Reset
              </Button>
            )}
          </>
        }
        bulkActions={(list, clear) => (
          <>
            <Button
              size="sm"
              variant="secondary"
              icon={<LogIn size={13} />}
              onClick={() => void bulkUpdate(list, "checked_in", clear)}
            >
              Check in
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<LogOut size={13} />}
              onClick={() => void bulkUpdate(list, "checked_out", clear)}
            >
              Check out
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<CheckCircle2 size={13} />}
              onClick={() => void bulkUpdate(list, "completed", clear)}
            >
              Complete
            </Button>
            <Button
              size="sm"
              variant="dangerGhost"
              icon={<XCircle size={13} />}
              onClick={() => void bulkUpdate(list, "cancelled", clear)}
            >
              Cancel
            </Button>
          </>
        )}
        actions={(b) => [
          { label: "View details", icon: <Eye size={14} />, onClick: () => setSelected(b) },
          {
            label: "Copy reference",
            icon: <Copy size={14} />,
            onClick: () => copyReference(b.bookingReference),
          },
          {
            label: "Mark checked in",
            icon: <LogIn size={14} />,
            separated: true,
            disabled: b.status === "checked_in",
            onClick: () => void updateStatus(b, "checked_in"),
          },
          {
            label: "Mark checked out",
            icon: <LogOut size={14} />,
            disabled: b.status === "checked_out",
            onClick: () => void updateStatus(b, "checked_out"),
          },
          {
            label: "Cancel booking",
            icon: <XCircle size={14} />,
            danger: true,
            separated: true,
            disabled: b.status === "cancelled",
            onClick: () => void updateStatus(b, "cancelled"),
          },
        ]}
        emptyIcon={<CalendarCheck size={19} />}
        emptyTitle="No bookings match"
        emptyDescription="Bookings made on the public site appear here as soon as they are created."
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.bookingReference || "Booking"}
        description={selected ? `${selected.guestName} · ${humanise(selected.status)}` : undefined}
        footer={
          selected && (
            <>
              <Button variant="secondary" onClick={() => copyReference(selected.bookingReference)}>
                <Copy size={14} />
                Copy reference
              </Button>
              <Button variant="primary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={selected.status} />
              {selected.paymentStatus && <Badge status={selected.paymentStatus} />}
            </div>

            <DetailBlock title="Guest">
              <DetailLine label="Name" value={selected.guestName} />
              <DetailLine label="Email" value={selected.guestEmail} />
              <DetailLine label="Phone" value={selected.guestPhone || "—"} />
            </DetailBlock>

            <DetailBlock title="Stay">
              <DetailLine label="Check-in" value={shortDate(selected.checkInDate)} />
              <DetailLine label="Check-out" value={shortDate(selected.checkOutDate)} />
              <DetailLine
                label="Nights"
                value={String(nightsBetween(selected.checkInDate, selected.checkOutDate))}
              />
              {selected.rooms && selected.rooms.length > 0 && (
                <DetailLine
                  label="Rooms"
                  value={selected.rooms
                    .map((r) => `${r.roomName || "Room"}${r.quantity ? ` ×${r.quantity}` : ""}`)
                    .join(", ")}
                />
              )}
            </DetailBlock>

            <DetailBlock title="Payment">
              <DetailLine label="Total" value={currency(selected.totalAmount, true)} />
              {typeof selected.advancePaid === "number" && (
                <DetailLine label="Advance paid" value={currency(selected.advancePaid, true)} />
              )}
              <DetailLine
                label="Balance"
                value={currency(
                  Math.max(0, (selected.totalAmount || 0) - (selected.advancePaid || 0)),
                  true
                )}
              />
              {selected.createdAt && (
                <DetailLine label="Created" value={dateTime(selected.createdAt)} />
              )}
            </DetailBlock>

            <DetailBlock title="Change status">
              <div className="flex flex-wrap gap-2 pt-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    disabled={s === selected.status || busyId === selected._id}
                    onClick={() => void updateStatus(selected, s)}
                    className={
                      s === selected.status
                        ? "badge-brand cursor-default"
                        : "badge-neutral transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    }
                  >
                    {humanise(s)}
                  </button>
                ))}
              </div>
            </DetailBlock>
          </div>
        )}
      </Drawer>
    </RequireAdmin>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</h3>
      <dl className="divide-y divide-line-subtle rounded-lg border border-line">{children}</dl>
    </section>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right text-base text-ink-800">{value}</dd>
    </div>
  );
}
