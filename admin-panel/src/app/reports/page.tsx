"use client";

import { useEffect, useState } from "react";
import {
  BedDouble,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Loader2,
  Lock,
  PartyPopper,
  Star,
  Table2,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { consoleApi, downloadExport, type ExportDataset } from "@/lib/console";
import { cn } from "@/lib/cn";

/**
 * Exports and reports.
 *
 * The catalogue comes from the server (`GET /admin/console/exports`), including
 * which datasets this role may take. Datasets outside the caller's scope are
 * rendered locked rather than hidden — a manager wondering where the revenue
 * report went is a worse experience than one being told it is not theirs. The
 * API refuses them regardless of what this page draws.
 *
 * Files are fetched with the bearer token and handed to the browser as a blob;
 * see `downloadExport` for why a plain link would not work.
 */

const ICON: Record<string, LucideIcon> = {
  bookings: BedDouble,
  customers: UsersRound,
  reviews: Star,
  reservations: UtensilsCrossed,
  enquiries: PartyPopper,
  revenue: IndianRupee,
};

const FORMAT_ICON: Record<string, LucideIcon> = {
  csv: Table2,
  xlsx: FileSpreadsheet,
  pdf: FileText,
};

const FORMAT_LABEL: Record<string, string> = {
  csv: "CSV",
  xlsx: "Excel",
  pdf: "PDF",
};

/** Named windows, because "last 30 days" is what people actually want. */
const PRESETS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range…" },
];

export default function ReportsPage() {
  const { toastSuccess, toastError } = useToast();
  const [datasets, setDatasets] = useState<ExportDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [preset, setPreset] = useState("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    void consoleApi.exports().then((res) => {
      setLoading(false);
      if (res.success && res.data) setDatasets(res.data.datasets);
      else setError(res.message || "Could not load the export catalogue.");
    });
  }, []);

  function resolveRange(): { from?: string; to?: string } {
    if (preset === "all") return {};
    if (preset === "custom") {
      return { from: from || undefined, to: to || undefined };
    }
    const days = Number(preset);
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return { from: start.toISOString().slice(0, 10) };
  }

  async function handleDownload(dataset: ExportDataset, format: string) {
    const id = `${dataset.key}-${format}`;
    setBusy(id);

    const result = await downloadExport(dataset.key, format, resolveRange());

    setBusy(null);
    if (result.ok) {
      toastSuccess(`${dataset.label} exported as ${FORMAT_LABEL[format]}.`);
    } else {
      toastError(result.message);
    }
  }

  const rangeInvalid = preset === "custom" && Boolean(from) && Boolean(to) && from > to;

  return (
    <RequireAdmin>
      <div className="page-shell">
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Reports" }]}
          title="Export & reports"
          description="Download operational data as a spreadsheet or a printable report. Exports are read-only and never change a booking."
        />

        {/* Date range — chosen once, applied to whichever export you pick. */}
        <div className="card mb-5 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem]">
              <Select
                label="Date range"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                hint="Filters on when the record was created."
              >
                {PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>

            {preset === "custom" && (
              <>
                <TextInput
                  label="From"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <TextInput
                  label="To"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </>
            )}

            <p className="flex items-center gap-1.5 pb-2 text-xs text-ink-500">
              <CalendarRange size={13} />
              {preset === "all"
                ? "Every record, no date filter."
                : preset === "custom"
                  ? from || to
                    ? `${from || "the beginning"} → ${to || "today"}`
                    : "Pick at least one date, or the export covers everything."
                  : `${PRESETS.find((p) => p.value === preset)?.label} up to today.`}
            </p>
          </div>

          {rangeInvalid && (
            <p className="mt-2 text-sm text-danger-600">
              The start date is after the end date — no records can fall in that range.
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4">
                <span className="skeleton mb-3 block h-4 w-1/3 rounded" />
                <span className="skeleton mb-2 block h-3 w-full rounded" />
                <span className="skeleton block h-8 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<FileSpreadsheet size={20} />}
            title="Could not load the export catalogue"
            description={error}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {datasets.map((dataset) => {
              const Icon = ICON[dataset.key] ?? FileSpreadsheet;

              return (
                <div
                  key={dataset.key}
                  className={cn("card p-4", !dataset.allowed && "opacity-70")}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        dataset.allowed
                          ? "bg-brand-50 text-brand-600"
                          : "bg-surface-muted text-ink-400"
                      )}
                    >
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-ink-800">{dataset.label}</h2>
                        {!dataset.allowed && (
                          <span className="badge-neutral inline-flex items-center gap-1">
                            <Lock size={10} />
                            Not your scope
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-600">{dataset.description}</p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {dataset.formats.map((format) => {
                      const FormatIcon = FORMAT_ICON[format] ?? Table2;
                      const id = `${dataset.key}-${format}`;
                      const isBusy = busy === id;

                      return (
                        <Button
                          key={format}
                          variant="secondary"
                          size="sm"
                          disabled={!dataset.allowed || isBusy || rangeInvalid}
                          onClick={() => void handleDownload(dataset, format)}
                        >
                          {isBusy ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <FormatIcon size={13} />
                          )}
                          {FORMAT_LABEL[format]}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 space-y-1.5 text-xs text-ink-500">
          <p>
            <strong className="font-medium text-ink-600">Revenue</strong> counts money actually
            received — verified advance payments only. Amounts settled at the property are not
            visible to this system, so the booking value is shown beside it rather than added in.
          </p>
          <p>
            <strong className="font-medium text-ink-600">Hall enquiries</strong> carry no amount:
            hall bookings are approval-first and unpriced online, by design.
          </p>
          <p>
            Exports contain guest names, emails and phone numbers. Every download is recorded in the
            audit log with who took it and for which window.
          </p>
        </div>
      </div>
    </RequireAdmin>
  );
}
