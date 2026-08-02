"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Armchair,
  CalendarCheck,
  CheckCircle2,
  Copy,
  Eye,
  PartyPopper,
  UserX,
  Users,
  UtensilsCrossed,
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
import { useSummary, type ReservationSummary } from "@/lib/summary";
import { dateTime, humanise, isToday, shortDate, timeSlotLabel } from "@/lib/format";

/** The five statuses `updateReservationStatusSchema` accepts. */
const STATUS_OPTIONS = ["confirmed", "seated", "completed", "cancelled", "no_show"];

type WindowFilter = "all" | "today" | "upcoming" | "past";

/**
 * Restaurant table reservation book.
 *
 * Reads `GET /admin/restaurants/reservations` (via the shared summary cache)
 * and writes only via `PUT /admin/restaurants/reservations/:id/status`.
 *
 * Note there is no payment column: a table reservation takes no money, so the
 * only lifecycle here is confirmed → seated → completed (or cancelled/no-show).
 */
/**
 * useSearchParams() forces client-side rendering, so Next requires a Suspense
 * boundary above it for this route to build.
 */
export default function AdminReservationsPage() {
  return (
    <Suspense fallback={<ReservationsFallback />}>
      <ReservationsView />
    </Suspense>
  );
}

function ReservationsFallback() {
  return (
    <RequireAdmin>
      <PageHeader title="Table reservations" loading breadcrumbs={[{ label: "Reservations" }]} />
      <div className="card">
        <TableSkeleton rows={8} cols={6} />
      </div>
    </RequireAdmin>
  );
}

function ReservationsView() {
  const searchParams = useSearchParams();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { reservations, loading, error, reload } = useSummary();

  const [statusFilter, setStatusFilter] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("all");
  const [areaFilter, setAreaFilter] = useState("");
  const [selected, setSelected] = useState<ReservationSummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status && STATUS_OPTIONS.includes(status)) setStatusFilter(status);

    const windowParam = searchParams.get("window");
    if (windowParam === "today" || windowParam === "upcoming" || windowParam === "past") {
      setWindowFilter(windowParam);
    }
  }, [searchParams]);

  const refParam = searchParams.get("ref");
  useEffect(() => {
    if (!refParam || reservations.length === 0) return;
    const match = reservations.find((r) => r.reservationReference === refParam);
    if (match) setSelected(match);
  }, [refParam, reservations]);

  const areaNames = useMemo(
    () => Array.from(new Set(reservations.map((r) => r.diningAreaName).filter(Boolean))).sort(),
    [reservations]
  );

  const rows = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return reservations.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (areaFilter && r.diningAreaName !== areaFilter) return false;

      const when = new Date(r.reservationDate).getTime();
      if (windowFilter === "today") return isToday(r.reservationDate);
      if (windowFilter === "upcoming") return when >= startOfToday.getTime();
      if (windowFilter === "past") return when < startOfToday.getTime();
      return true;
    });
  }, [reservations, statusFilter, areaFilter, windowFilter]);

  const stats = useMemo(() => {
    const todays = reservations.filter(
      (r) => isToday(r.reservationDate) && r.status !== "cancelled"
    );
    return {
      inView: rows.length,
      todaysReservations: todays.length,
      todaysCovers: todays.reduce((sum, r) => sum + (r.partySize || 0), 0),
      noShows: reservations.filter((r) => r.status === "no_show").length,
    };
  }, [reservations, rows]);

  const updateStatus = useCallback(
    async (reservation: ReservationSummary, status: string) => {
      if (status === reservation.status) return;

      if (status === "cancelled" || status === "no_show") {
        const ok = await confirm({
          title: `Mark ${reservation.reservationReference} as ${humanise(status).toLowerCase()}?`,
          description:
            "The table is released back into availability for that sitting. The guest is not emailed by this action.",
          confirmLabel: `Set ${humanise(status).toLowerCase()}`,
          danger: true,
        });
        if (!ok) return;
      }

      setBusyId(reservation._id);
      const res = await adminApi.put(
        `/admin/restaurants/reservations/${reservation._id}/status`,
        { status }
      );
      setBusyId(null);

      if (!res.success) {
        toastError(formatApiError(res));
        return;
      }

      toastSuccess(`${reservation.reservationReference} → ${humanise(status).toLowerCase()}.`);
      setSelected((prev) => (prev && prev._id === reservation._id ? { ...prev, status } : prev));
      reload();
    },
    [confirm, reload, toastError, toastSuccess]
  );

  async function bulkUpdate(list: ReservationSummary[], status: string, clear: () => void) {
    const ok = await confirm({
      title: `Set ${list.length} reservation${list.length === 1 ? "" : "s"} to ${humanise(status).toLowerCase()}?`,
      description: "Each reservation is updated individually; any the API rejects are reported.",
      confirmLabel: "Update",
      danger: ["cancelled", "no_show"].includes(status),
    });
    if (!ok) return;

    let failures = 0;
    for (const reservation of list) {
      const res = await adminApi.put(
        `/admin/restaurants/reservations/${reservation._id}/status`,
        { status }
      );
      if (!res.success) failures += 1;
    }

    clear();
    if (failures > 0) toastError(`${failures} reservation(s) could not be updated.`);
    else toastSuccess(`${list.length} reservation(s) updated.`);
    reload();
  }

  function copyReference(reference: string) {
    void navigator.clipboard?.writeText(reference);
    toastSuccess("Reservation reference copied.");
  }

  const columns: Column<ReservationSummary>[] = [
    {
      key: "reference",
      header: "Reference",
      sortable: true,
      accessor: (r) => r.reservationReference,
      render: (r) => (
        <button
          onClick={() => setSelected(r)}
          className="font-mono text-sm font-medium text-brand-700 hover:underline"
        >
          {r.reservationReference}
        </button>
      ),
    },
    {
      key: "guest",
      header: "Guest",
      sortable: true,
      accessor: (r) => r.guestName,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-800">{r.guestName}</p>
          <p className="truncate text-xs text-ink-500">{r.guestPhone || r.guestEmail}</p>
        </div>
      ),
    },
    {
      key: "when",
      header: "When",
      sortable: true,
      accessor: (r) => `${new Date(r.reservationDate).getTime()}-${r.timeSlot}`,
      render: (r) => (
        <div className="whitespace-nowrap">
          <p className="text-ink-800">{shortDate(r.reservationDate)}</p>
          <p className="text-xs text-ink-500">{timeSlotLabel(r.timeSlot)}</p>
        </div>
      ),
    },
    {
      key: "area",
      header: "Area",
      sortable: true,
      accessor: (r) => r.diningAreaName,
      hideBelow: "md",
      render: (r) => <Badge tone="neutral">{r.diningAreaName}</Badge>,
    },
    {
      key: "party",
      header: "Party",
      sortable: true,
      accessor: (r) => r.partySize,
      align: "right",
      render: (r) => (
        <span className="whitespace-nowrap tabular-nums">
          {r.partySize}
          {r.tablesReserved ? (
            <span className="text-xs text-ink-500"> · {r.tablesReserved} table(s)</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => (
        <select
          value={r.status}
          disabled={busyId === r._id}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => void updateStatus(r, e.target.value)}
          aria-label={`Status for ${r.reservationReference}`}
          className="input w-auto min-w-[8rem] py-1 text-sm capitalize"
        >
          {/* Include the current value even if it isn't settable, so the select
              never silently shows the wrong status. */}
          {(STATUS_OPTIONS.includes(r.status) ? STATUS_OPTIONS : [r.status, ...STATUS_OPTIONS]).map(
            (s) => (
              <option key={s} value={s}>
                {humanise(s)}
              </option>
            )
          )}
        </select>
      ),
    },
  ];

  return (
    <RequireAdmin>
      <PageHeader
        title="Table reservations"
        description="The restaurant's book. No payment is taken for a table — status is the whole lifecycle."
        breadcrumbs={[{ label: "Reservations" }]}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Reservations in view"
          value={stats.inView}
          icon={<CalendarCheck size={15} />}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Sittings today"
          value={stats.todaysReservations}
          icon={<UtensilsCrossed size={15} />}
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Covers today"
          value={stats.todaysCovers}
          hint="Total guests expected"
          icon={<Users size={15} />}
          loading={loading}
        />
        <StatCard
          label="No-shows"
          value={stats.noShows}
          hint="All time"
          icon={<UserX size={15} />}
          tone={stats.noShows > 0 ? "warning" : "neutral"}
          loading={loading}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={reload}
        pageSize={15}
        searchable={(r) =>
          `${r.reservationReference} ${r.guestName} ${r.guestEmail} ${r.guestPhone || ""} ${r.diningAreaName} ${r.occasion || ""}`
        }
        searchPlaceholder="Search reference, guest, phone…"
        initialSort={{ key: "when", direction: "desc" }}
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
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
            {areaNames.length > 1 && (
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                aria-label="Filter by dining area"
                className="input w-auto py-1.5"
              >
                <option value="">All areas</option>
                {areaNames.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
            {(statusFilter || areaFilter || windowFilter !== "all") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setStatusFilter("");
                  setAreaFilter("");
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
              icon={<Armchair size={13} />}
              onClick={() => void bulkUpdate(list, "seated", clear)}
            >
              Seat
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
              icon={<UserX size={13} />}
              onClick={() => void bulkUpdate(list, "no_show", clear)}
            >
              No-show
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
        actions={(r) => [
          { label: "View details", icon: <Eye size={14} />, onClick: () => setSelected(r) },
          {
            label: "Copy reference",
            icon: <Copy size={14} />,
            onClick: () => copyReference(r.reservationReference),
          },
          {
            label: "Mark seated",
            icon: <Armchair size={14} />,
            separated: true,
            disabled: r.status === "seated",
            onClick: () => void updateStatus(r, "seated"),
          },
          {
            label: "Mark completed",
            icon: <CheckCircle2 size={14} />,
            disabled: r.status === "completed",
            onClick: () => void updateStatus(r, "completed"),
          },
          {
            label: "Mark no-show",
            icon: <UserX size={14} />,
            danger: true,
            separated: true,
            disabled: r.status === "no_show",
            onClick: () => void updateStatus(r, "no_show"),
          },
          {
            label: "Cancel reservation",
            icon: <XCircle size={14} />,
            danger: true,
            disabled: r.status === "cancelled",
            onClick: () => void updateStatus(r, "cancelled"),
          },
        ]}
        emptyIcon={<CalendarCheck size={19} />}
        emptyTitle="No reservations match"
        emptyDescription="Table reservations made on the public site appear here immediately — they need no approval."
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.reservationReference || "Reservation"}
        description={selected ? `${selected.guestName} · ${humanise(selected.status)}` : undefined}
        footer={
          selected && (
            <>
              <Button
                variant="secondary"
                onClick={() => copyReference(selected.reservationReference)}
              >
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
            <Badge status={selected.status} />

            <DetailBlock title="Guest">
              <DetailLine label="Name" value={selected.guestName} />
              <DetailLine label="Email" value={selected.guestEmail} />
              <DetailLine label="Phone" value={selected.guestPhone || "—"} />
            </DetailBlock>

            <DetailBlock title="Sitting">
              <DetailLine label="Date" value={shortDate(selected.reservationDate)} />
              <DetailLine label="Time" value={timeSlotLabel(selected.timeSlot)} />
              <DetailLine label="Dining area" value={selected.diningAreaName} />
              <DetailLine label="Party size" value={String(selected.partySize)} />
              {typeof selected.tablesReserved === "number" && (
                <DetailLine label="Tables held" value={String(selected.tablesReserved)} />
              )}
              {selected.createdAt && (
                <DetailLine label="Booked" value={dateTime(selected.createdAt)} />
              )}
            </DetailBlock>

            {(selected.occasion || selected.specialRequest) && (
              <DetailBlock title="Guest notes">
                {selected.occasion && (
                  <DetailLine label="Occasion" value={selected.occasion} />
                )}
                {selected.specialRequest && (
                  <div className="px-3.5 py-2.5">
                    <p className="mb-1 flex items-center gap-1.5 text-sm text-ink-500">
                      <PartyPopper size={13} />
                      Special request
                    </p>
                    <p className="whitespace-pre-line text-base text-ink-800">
                      {selected.specialRequest}
                    </p>
                  </div>
                )}
              </DetailBlock>
            )}

            <DetailBlock title="Change status">
              <div className="flex flex-wrap gap-2 p-3.5">
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
