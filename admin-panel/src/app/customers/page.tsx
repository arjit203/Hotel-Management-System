"use client";

import { useMemo, useState } from "react";
import {
  BedDouble,
  Copy,
  Mail,
  PartyPopper,
  Phone,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSummary } from "@/lib/summary";
import { currency, dateTime, initials, relativeTime, shortDate, timeSlotLabel } from "@/lib/format";

interface CustomerRow {
  email: string;
  name: string;
  phone?: string;
  bookings: number;
  reservations: number;
  enquiries: number;
  totalSpend: number;
  lastActivity: number;
  hasHotel: boolean;
  hasRestaurant: boolean;
  hasHall: boolean;
}

/** Booking statuses that represent money the guest actually committed. */
const REVENUE_STATUSES = new Set(["confirmed", "checked_in", "checked_out", "completed"]);

/**
 * Customer directory.
 *
 * IMPORTANT: this is not a user-accounts list. The backend has no admin route
 * that enumerates registered users, and guest checkout means most customers
 * never create an account at all. So this page derives a directory from the
 * bookings, reservations and hall enquiries already loaded, keyed on the guest
 * email that ownership checks use everywhere else in the system.
 */
export default function CustomersPage() {
  const { bookings, reservations, hallEnquiries, loading, error, reload } = useSummary();
  const { toastSuccess } = useToast();
  const [selected, setSelected] = useState<CustomerRow | null>(null);

  const customers = useMemo(() => {
    const byEmail = new Map<string, CustomerRow>();

    function ensure(email: string, name: string, phone?: string): CustomerRow {
      const key = email.toLowerCase();
      let row = byEmail.get(key);
      if (!row) {
        row = {
          email: key,
          name,
          phone,
          bookings: 0,
          reservations: 0,
          enquiries: 0,
          totalSpend: 0,
          lastActivity: 0,
          hasHotel: false,
          hasRestaurant: false,
          hasHall: false,
        };
        byEmail.set(key, row);
      }
      // Keep the most complete name/phone we've seen for this guest.
      if (!row.phone && phone) row.phone = phone;
      if (name && name.length > row.name.length) row.name = name;
      return row;
    }

    for (const b of bookings) {
      if (!b.guestEmail) continue;
      const row = ensure(b.guestEmail, b.guestName, b.guestPhone);
      row.bookings += 1;
      row.hasHotel = true;
      if (REVENUE_STATUSES.has(b.status)) row.totalSpend += b.totalAmount || 0;
      const when = new Date(b.createdAt || b.checkInDate).getTime();
      if (!Number.isNaN(when)) row.lastActivity = Math.max(row.lastActivity, when);
    }

    for (const r of reservations) {
      if (!r.guestEmail) continue;
      const row = ensure(r.guestEmail, r.guestName, r.guestPhone);
      row.reservations += 1;
      row.hasRestaurant = true;
      const when = new Date(r.createdAt || r.reservationDate).getTime();
      if (!Number.isNaN(when)) row.lastActivity = Math.max(row.lastActivity, when);
    }

    for (const e of hallEnquiries) {
      if (!e.guestEmail) continue;
      // Declined and cancelled enquiries still identify a real family who
      // approached the venue, so they belong in the directory too.
      const row = ensure(e.guestEmail, e.guestName, e.guestPhone);
      row.enquiries += 1;
      row.hasHall = true;
      const when = new Date(e.createdAt || e.eventDate).getTime();
      if (!Number.isNaN(when)) row.lastActivity = Math.max(row.lastActivity, when);
    }

    return Array.from(byEmail.values());
  }, [bookings, reservations, hallEnquiries]);

  const stats = useMemo(
    () => ({
      total: customers.length,
      repeat: customers.filter((c) => c.bookings + c.reservations + c.enquiries > 1).length,
      crossVertical: customers.filter(
        (c) => [c.hasHotel, c.hasRestaurant, c.hasHall].filter(Boolean).length > 1
      ).length,
      lifetimeValue: customers.reduce((sum, c) => sum + c.totalSpend, 0),
    }),
    [customers]
  );

  const selectedBookings = useMemo(
    () =>
      selected
        ? bookings.filter((b) => b.guestEmail?.toLowerCase() === selected.email)
        : [],
    [bookings, selected]
  );

  const selectedReservations = useMemo(
    () =>
      selected
        ? reservations.filter((r) => r.guestEmail?.toLowerCase() === selected.email)
        : [],
    [reservations, selected]
  );

  const selectedEnquiries = useMemo(
    () =>
      selected
        ? hallEnquiries.filter((e) => e.guestEmail?.toLowerCase() === selected.email)
        : [],
    [hallEnquiries, selected]
  );

  function copy(value: string, label: string) {
    void navigator.clipboard?.writeText(value);
    toastSuccess(`${label} copied.`);
  }

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      sortable: true,
      accessor: (c) => c.name,
      render: (c) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            {initials(c.name)}
          </span>
          <div className="min-w-0">
            <button
              onClick={() => setSelected(c)}
              className="block max-w-full truncate text-left font-medium text-ink-800 hover:text-brand-700 hover:underline"
            >
              {c.name}
            </button>
            <span className="block truncate text-xs text-ink-500">{c.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      accessor: (c) => c.phone ?? "",
      hideBelow: "lg",
      render: (c) => <span className="tabular-nums text-ink-600">{c.phone || "—"}</span>,
    },
    {
      key: "activity",
      header: "Activity",
      accessor: (c) => c.bookings + c.reservations + c.enquiries,
      sortable: true,
      hideBelow: "sm",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.bookings > 0 && (
            <Badge tone="brand" icon={<BedDouble size={11} />}>
              {c.bookings} stay{c.bookings === 1 ? "" : "s"}
            </Badge>
          )}
          {c.reservations > 0 && (
            <Badge tone="info" icon={<UtensilsCrossed size={11} />}>
              {c.reservations} table{c.reservations === 1 ? "" : "s"}
            </Badge>
          )}
          {c.enquiries > 0 && (
            <Badge tone="warning" icon={<PartyPopper size={11} />}>
              {c.enquiries} enquir{c.enquiries === 1 ? "y" : "ies"}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "spend",
      header: "Room spend",
      sortable: true,
      accessor: (c) => c.totalSpend,
      align: "right",
      render: (c) => <span className="tabular-nums">{currency(c.totalSpend)}</span>,
    },
    {
      key: "last",
      header: "Last seen",
      sortable: true,
      accessor: (c) => c.lastActivity,
      align: "right",
      hideBelow: "md",
      render: (c) => (
        <span className="whitespace-nowrap text-ink-600">
          {c.lastActivity ? relativeTime(new Date(c.lastActivity)) : "—"}
        </span>
      ),
    },
  ];

  return (
    <RequireAdmin>
      <PageHeader
        title="Customers"
        description="Built from booking, reservation and hall enquiry records, keyed on guest email."
        breadcrumbs={[{ label: "Customers" }]}
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-info-100 bg-info-50 px-4 py-2.5">
        <UsersRound size={15} className="mt-0.5 shrink-0 text-info-600" />
        <p className="text-base text-info-700">
          Guest checkout means most customers never register an account, and the API exposes no
          user directory — so this list is assembled from what guests actually booked or enquired
          about, not from user records.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Customers"
          value={stats.total}
          hint="Unique guest emails"
          icon={<UsersRound size={15} />}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Repeat customers"
          value={stats.repeat}
          hint="More than one visit"
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Multi-vertical"
          value={stats.crossVertical}
          hint="Used more than one vertical"
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Total room spend"
          value={currency(stats.lifetimeValue)}
          hint="Excludes cancelled"
          loading={loading}
        />
      </div>

      <DataTable
        columns={columns}
        rows={customers}
        rowKey={(c) => c.email}
        loading={loading}
        error={error}
        onRetry={reload}
        pageSize={15}
        searchable={(c) => `${c.name} ${c.email} ${c.phone || ""}`}
        searchPlaceholder="Search name, email, phone…"
        initialSort={{ key: "last", direction: "desc" }}
        onRowClick={(c) => setSelected(c)}
        emptyIcon={<UsersRound size={19} />}
        emptyTitle="No customers yet"
        emptyDescription="Guests appear here once they make their first booking or reservation."
        actions={(c) => [
          { label: "View history", icon: <UsersRound size={14} />, onClick: () => setSelected(c) },
          {
            label: "Copy email",
            icon: <Mail size={14} />,
            onClick: () => copy(c.email, "Email"),
          },
          {
            label: "Copy phone",
            icon: <Phone size={14} />,
            disabled: !c.phone,
            onClick: () => copy(c.phone || "", "Phone"),
          },
        ]}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || "Customer"}
        description={selected?.email}
        footer={
          selected && (
            <>
              <Button variant="secondary" onClick={() => copy(selected.email, "Email")}>
                <Copy size={14} />
                Copy email
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
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-line p-3">
                <p className="text-xs text-ink-500">Hotel stays</p>
                <p className="text-xl font-semibold text-ink-900">{selected.bookings}</p>
              </div>
              <div className="rounded-lg border border-line p-3">
                <p className="text-xs text-ink-500">Tables</p>
                <p className="text-xl font-semibold text-ink-900">{selected.reservations}</p>
              </div>
              <div className="rounded-lg border border-line p-3">
                <p className="text-xs text-ink-500">Hall enquiries</p>
                <p className="text-xl font-semibold text-ink-900">{selected.enquiries}</p>
              </div>
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Contact
              </h3>
              <dl className="divide-y divide-line-subtle rounded-lg border border-line">
                <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                  <dt className="text-sm text-ink-500">Email</dt>
                  <dd className="min-w-0 truncate text-base text-ink-800">{selected.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                  <dt className="text-sm text-ink-500">Phone</dt>
                  <dd className="text-base text-ink-800">{selected.phone || "—"}</dd>
                </div>
              </dl>
            </section>

            {selectedBookings.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Hotel bookings
                </h3>
                <ul className="divide-y divide-line-subtle rounded-lg border border-line">
                  {selectedBookings.map((b) => (
                    <li key={b._id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm text-ink-700">
                          {b.bookingReference}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {shortDate(b.checkInDate)} → {shortDate(b.checkOutDate)}
                        </p>
                      </div>
                      <span className="tabular-nums text-sm text-ink-600">
                        {currency(b.totalAmount)}
                      </span>
                      <Badge status={b.status} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {selectedReservations.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Table reservations
                </h3>
                <ul className="divide-y divide-line-subtle rounded-lg border border-line">
                  {selectedReservations.map((r) => (
                    <li key={r._id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm text-ink-700">
                          {r.reservationReference}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {shortDate(r.reservationDate)} · {timeSlotLabel(r.timeSlot)} ·{" "}
                          {r.diningAreaName}
                        </p>
                      </div>
                      <Badge status={r.status} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {selectedEnquiries.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Hall enquiries
                </h3>
                <ul className="divide-y divide-line-subtle rounded-lg border border-line">
                  {selectedEnquiries.map((e) => (
                    <li key={e._id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm text-ink-700">
                          {e.enquiryReference}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {e.eventType} · {shortDate(e.eventDate)} ·{" "}
                          {e.guestCount.toLocaleString("en-IN")} guests
                        </p>
                      </div>
                      <Badge status={e.status} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {selected.lastActivity > 0 && (
              <p className="text-sm text-ink-500">
                Last activity {dateTime(new Date(selected.lastActivity))}
              </p>
            )}
          </div>
        )}
      </Drawer>
    </RequireAdmin>
  );
}
