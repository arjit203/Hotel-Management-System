"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  Mail,
  MessageSquare,
  PartyPopper,
  Phone,
  ThumbsUp,
  Users,
  XCircle,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminApi, formatApiError } from "@/lib/api";
import { useSummary, type HallEnquirySummary } from "@/lib/summary";
import { dateTime, humanise, relativeTime, shortDate } from "@/lib/format";

/** The six statuses `updateHallEnquiryStatusSchema` accepts. */
const STATUS_OPTIONS = [
  "pending",
  "reviewing",
  "approved",
  "confirmed",
  "declined",
  "cancelled",
];

/**
 * Statuses that mean "the venue has not answered yet". `approved` is excluded —
 * the family has been told yes and the conversation is live.
 */
const OPEN_STATUSES = new Set(["pending", "reviewing"]);

type WindowFilter = "all" | "upcoming" | "past";

/**
 * Marriage Hall enquiry book.
 *
 * ── The one thing to understand before changing this page ──
 * `confirmed` is not just a label: `updateEnquiryStatus` writes a `booked`
 * override onto the hall calendar for that date, and moving the enquiry away
 * from confirmed releases it. So the status dropdown here is the mechanism that
 * takes a date off the public calendar — the confirmation dialogs say so
 * explicitly rather than letting someone discover it by accident.
 *
 * `approved` deliberately does NOT hold the date, which is why it exists as a
 * separate step: several families can be talking to the venue about the same
 * auspicious date.
 */
export default function AdminEnquiriesPage() {
  return (
    <Suspense fallback={<EnquiriesFallback />}>
      <EnquiriesView />
    </Suspense>
  );
}

function EnquiriesFallback() {
  return (
    <RequireAdmin>
      <PageHeader title="Hall enquiries" loading breadcrumbs={[{ label: "Enquiries" }]} />
      <div className="card">
        <TableSkeleton rows={8} cols={6} />
      </div>
    </RequireAdmin>
  );
}

function EnquiriesView() {
  const searchParams = useSearchParams();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { hallEnquiries, loading, error, reload } = useSummary();

  const [statusFilter, setStatusFilter] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("all");
  const [selected, setSelected] = useState<HallEnquirySummary | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  useEffect(() => {
    const status = searchParams.get("status");
    if (status && STATUS_OPTIONS.includes(status)) setStatusFilter(status);
    if (searchParams.get("open") === "true") setStatusFilter("pending");

    const windowParam = searchParams.get("window");
    if (windowParam === "upcoming" || windowParam === "past") setWindowFilter(windowParam);
  }, [searchParams]);

  const refParam = searchParams.get("ref");
  useEffect(() => {
    if (!refParam || hallEnquiries.length === 0) return;
    const match = hallEnquiries.find((e) => e.enquiryReference === refParam);
    if (match) setSelected(match);
  }, [refParam, hallEnquiries]);

  // Keep the notes textarea in sync with whichever enquiry is open.
  useEffect(() => {
    setNotesDraft(selected?.adminNotes ?? "");
  }, [selected]);

  const rows = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return hallEnquiries.filter((e) => {
      if (statusFilter && e.status !== statusFilter) return false;
      const when = new Date(e.eventDate).getTime();
      if (windowFilter === "upcoming") return when >= startOfToday.getTime();
      if (windowFilter === "past") return when < startOfToday.getTime();
      return true;
    });
  }, [hallEnquiries, statusFilter, windowFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      needsAction: hallEnquiries.filter((e) => OPEN_STATUSES.has(e.status)).length,
      inConversation: hallEnquiries.filter((e) => e.status === "approved").length,
      confirmedUpcoming: hallEnquiries.filter(
        (e) => e.status === "confirmed" && new Date(e.eventDate).getTime() >= now
      ).length,
      totalGuests: hallEnquiries
        .filter((e) => e.status === "confirmed" && new Date(e.eventDate).getTime() >= now)
        .reduce((sum, e) => sum + (e.guestCount || 0), 0),
    };
  }, [hallEnquiries]);

  const updateStatus = useCallback(
    async (enquiry: HallEnquirySummary, status: string, adminNotes?: string) => {
      if (status === enquiry.status && adminNotes === undefined) return;

      if (status === "confirmed" && enquiry.status !== "confirmed") {
        const ok = await confirm({
          title: `Confirm ${enquiry.enquiryReference}?`,
          description: `This holds ${shortDate(enquiry.eventDate)} for ${enquiry.guestName} and marks it booked on the public calendar. Only do this once you have spoken to the family.`,
          confirmLabel: "Confirm and hold the date",
        });
        if (!ok) return;
      }

      if (enquiry.status === "confirmed" && status !== "confirmed") {
        const ok = await confirm({
          title: `Release ${shortDate(enquiry.eventDate)}?`,
          description:
            "This enquiry currently holds that date. Changing its status frees the date on the public calendar and other families can enquire about it again.",
          confirmLabel: "Release the date",
          danger: true,
        });
        if (!ok) return;
      }

      if (status === "declined") {
        const ok = await confirm({
          title: `Decline ${enquiry.enquiryReference}?`,
          description: `${enquiry.guestName} will be emailed to say the venue isn't available on that date.`,
          confirmLabel: "Decline",
          danger: true,
        });
        if (!ok) return;
      }

      setBusyId(enquiry._id);
      const res = await adminApi.put(`/admin/halls/enquiries/${enquiry._id}/status`, {
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      });
      setBusyId(null);

      if (!res.success) {
        toastError(formatApiError(res));
        return;
      }

      toastSuccess(`${enquiry.enquiryReference} → ${humanise(status).toLowerCase()}.`);
      setSelected((prev) => (prev && prev._id === enquiry._id ? { ...prev, status } : prev));
      reload();
    },
    [confirm, reload, toastError, toastSuccess]
  );

  async function saveNotes() {
    if (!selected) return;
    setBusyId(selected._id);
    const res = await adminApi.put(`/admin/halls/enquiries/${selected._id}/status`, {
      status: selected.status,
      adminNotes: notesDraft,
    });
    setBusyId(null);

    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Notes saved.");
    reload();
  }

  function copyReference(reference: string) {
    void navigator.clipboard?.writeText(reference);
    toastSuccess("Reference copied.");
  }

  const columns: Column<HallEnquirySummary>[] = [
    {
      key: "reference",
      header: "Reference",
      sortable: true,
      accessor: (e) => e.enquiryReference,
      render: (e) => (
        <button
          onClick={() => setSelected(e)}
          className="font-mono text-sm font-medium text-brand-700 hover:underline"
        >
          {e.enquiryReference}
        </button>
      ),
    },
    {
      key: "guest",
      header: "Family",
      sortable: true,
      accessor: (e) => e.guestName,
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-800">{e.guestName}</p>
          <p className="truncate text-xs text-ink-500">{e.guestPhone || e.guestEmail}</p>
        </div>
      ),
    },
    {
      key: "event",
      header: "Event",
      sortable: true,
      accessor: (e) => new Date(e.eventDate).getTime(),
      render: (e) => (
        <div className="whitespace-nowrap">
          <p className="text-ink-800">{shortDate(e.eventDate)}</p>
          <p className="text-xs text-ink-500">
            {e.eventType}
            {e.alternateDate ? ` · alt ${shortDate(e.alternateDate)}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "guests",
      header: "Guests",
      sortable: true,
      accessor: (e) => e.guestCount,
      align: "right",
      hideBelow: "md",
      render: (e) => <span className="tabular-nums">{e.guestCount.toLocaleString("en-IN")}</span>,
    },
    {
      key: "package",
      header: "Interest",
      accessor: (e) => e.packageName ?? "",
      hideBelow: "lg",
      render: (e) =>
        e.packageName ? (
          <Badge tone="neutral">{e.packageName}</Badge>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (e) => e.status,
      render: (e) => (
        <select
          value={e.status}
          disabled={busyId === e._id}
          onClick={(ev) => ev.stopPropagation()}
          onChange={(ev) => void updateStatus(e, ev.target.value)}
          aria-label={`Status for ${e.enquiryReference}`}
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
        title="Hall enquiries"
        description="Approval-first: nothing is reserved or charged until you confirm an enquiry."
        breadcrumbs={[{ label: "Enquiries" }]}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Needs a reply"
          value={stats.needsAction}
          hint="Pending or reviewing"
          icon={<CalendarClock size={15} />}
          tone={stats.needsAction > 0 ? "warning" : "neutral"}
          loading={loading}
        />
        <StatCard
          label="In conversation"
          value={stats.inConversation}
          hint="Approved, date not yet held"
          icon={<MessageSquare size={15} />}
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Confirmed events"
          value={stats.confirmedUpcoming}
          hint="Upcoming, date held"
          icon={<CheckCircle2 size={15} />}
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Guests expected"
          value={stats.totalGuests.toLocaleString("en-IN")}
          hint="Across confirmed events"
          icon={<Users size={15} />}
          loading={loading}
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e._id}
        loading={loading}
        error={error}
        onRetry={reload}
        pageSize={15}
        searchable={(e) =>
          `${e.enquiryReference} ${e.guestName} ${e.guestEmail} ${e.guestPhone || ""} ${e.eventType} ${e.packageName || ""}`
        }
        searchPlaceholder="Search reference, family, phone…"
        initialSort={{ key: "event", direction: "asc" }}
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
              <option value="upcoming">Upcoming events</option>
              <option value="past">Past events</option>
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
        actions={(e) => [
          { label: "View enquiry", icon: <Eye size={14} />, onClick: () => setSelected(e) },
          {
            label: "Copy reference",
            icon: <Copy size={14} />,
            onClick: () => copyReference(e.enquiryReference),
          },
          {
            label: "Call the family",
            icon: <Phone size={14} />,
            disabled: !e.guestPhone,
            onClick: () => window.open(`tel:${(e.guestPhone || "").replace(/\s/g, "")}`),
          },
          {
            label: "Email the family",
            icon: <Mail size={14} />,
            onClick: () =>
              window.open(
                `mailto:${e.guestEmail}?subject=${encodeURIComponent(`Your enquiry ${e.enquiryReference}`)}`
              ),
          },
          {
            label: "Mark approved",
            icon: <ThumbsUp size={14} />,
            separated: true,
            disabled: e.status === "approved",
            onClick: () => void updateStatus(e, "approved"),
          },
          {
            label: "Confirm and hold the date",
            icon: <CheckCircle2 size={14} />,
            disabled: e.status === "confirmed",
            onClick: () => void updateStatus(e, "confirmed"),
          },
          {
            label: "Decline",
            icon: <XCircle size={14} />,
            danger: true,
            separated: true,
            disabled: e.status === "declined",
            onClick: () => void updateStatus(e, "declined"),
          },
        ]}
        emptyIcon={<PartyPopper size={19} />}
        emptyTitle="No enquiries match"
        emptyDescription="Enquiries sent from the Marriage Hall availability page arrive here immediately."
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.enquiryReference || "Enquiry"}
        description={selected ? `${selected.guestName} · ${humanise(selected.status)}` : undefined}
        footer={
          selected && (
            <>
              <Button
                variant="secondary"
                onClick={() => window.open(`tel:${(selected.guestPhone || "").replace(/\s/g, "")}`)}
                disabled={!selected.guestPhone}
              >
                <Phone size={14} />
                Call
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

            {selected.status === "confirmed" && (
              <p className="rounded-md border border-success-100 bg-success-50 px-3.5 py-2.5 text-sm text-success-700">
                This enquiry holds {shortDate(selected.eventDate)} — the date shows as booked on the
                public calendar. Changing the status releases it.
              </p>
            )}

            <DetailBlock title="Family">
              <DetailLine label="Name" value={selected.guestName} />
              <DetailLine label="Email" value={selected.guestEmail} />
              <DetailLine label="Phone" value={selected.guestPhone || "—"} />
            </DetailBlock>

            <DetailBlock title="Event">
              <DetailLine label="Occasion" value={selected.eventType} />
              <DetailLine label="Preferred date" value={shortDate(selected.eventDate)} />
              {selected.alternateDate && (
                <DetailLine label="Alternate date" value={shortDate(selected.alternateDate)} />
              )}
              <DetailLine label="Expected guests" value={selected.guestCount.toLocaleString("en-IN")} />
              {selected.createdAt && (
                <DetailLine
                  label="Enquired"
                  value={`${dateTime(selected.createdAt)} (${relativeTime(selected.createdAt)})`}
                />
              )}
            </DetailBlock>

            {(selected.packageName ||
              selected.decorationThemeName ||
              selected.cateringPreference ||
              selected.budgetRange) && (
              <DetailBlock title="Their preferences">
                {selected.packageName && (
                  <DetailLine label="Package" value={selected.packageName} />
                )}
                {selected.decorationThemeName && (
                  <DetailLine label="Decoration" value={selected.decorationThemeName} />
                )}
                {selected.cateringPreference && (
                  <DetailLine label="Catering" value={selected.cateringPreference} />
                )}
                {selected.budgetRange && (
                  <DetailLine label="Budget" value={selected.budgetRange} />
                )}
              </DetailBlock>
            )}

            {selected.specialRequirements && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  What they told us
                </h3>
                <p className="whitespace-pre-line rounded-lg border border-line bg-surface-hover px-3.5 py-3 text-base text-ink-700">
                  {selected.specialRequirements}
                </p>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Internal notes
              </h3>
              <TextArea
                rows={4}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Called 3 Aug, wants the lawn for Mehendi. Quote sent."
                hint="Staff only — never sent to the family or shown on the public enquiry lookup."
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                loading={busyId === selected._id}
                onClick={saveNotes}
              >
                Save notes
              </Button>
            </section>

            <DetailBlock title="Move this enquiry">
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
              <p className="border-t border-line-subtle px-3.5 py-2.5 text-xs text-ink-500">
                <strong>Approved</strong> tells the family yes but leaves the date open —
                <strong> Confirmed</strong> is what actually holds it.
              </p>
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
