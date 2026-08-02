"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { adminApi, formatApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Select, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { shortDate } from "@/lib/format";

type DateStatus = "available" | "tentative" | "booked" | "blocked";

interface CalendarDay {
  date: string;
  status: DateStatus;
  /** Admin reads include the reason; the public route strips it. */
  reason?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_CELL: Record<DateStatus, string> = {
  available: "border-line bg-white text-ink-700 hover:border-brand-400",
  tentative: "border-warning-100 bg-warning-50 text-warning-700",
  booked: "border-success-100 bg-success-50 text-success-700",
  blocked: "border-danger-100 bg-danger-50 text-danger-700",
};

const LEGEND: { status: DateStatus; label: string; hint: string }[] = [
  { status: "available", label: "Available", hint: "Open for enquiries" },
  { status: "tentative", label: "Tentative", hint: "An enquiry is in progress" },
  { status: "booked", label: "Booked", hint: "Confirmed — the date is held" },
  { status: "blocked", label: "Blocked", hint: "Held back by staff" },
];

/**
 * Availability calendar management.
 *
 * Statuses are computed by the backend: an admin override wins, otherwise a
 * confirmed enquiry reads as booked and a pending one as tentative. So most
 * cells here are *derived*, not set by hand — which is why clicking a date
 * explains where its current status came from before offering to change it.
 *
 * Setting a date back to "available" deletes the override rather than storing
 * one, and the dialog says so.
 */
export default function CalendarPanel({
  hallId,
  className,
}: {
  hallId: string;
  className?: string;
}) {
  const { toastSuccess, toastError } = useToast();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<CalendarDay | null>(null);
  const [form, setForm] = useState<{ status: DateStatus; reason: string }>({
    status: "blocked",
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminApi.get<{ days: CalendarDay[] }>(
      `/admin/halls/${hallId}/calendar?year=${year}&month=${month}`
    );
    if (res.success && res.data) setDays(res.data.days);
    else setError(formatApiError(res));
    setLoading(false);
  }, [hallId, year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    days.forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);

  const counts = useMemo(() => {
    const tally: Record<DateStatus, number> = {
      available: 0,
      tentative: 0,
      booked: 0,
      blocked: 0,
    };
    days.forEach((d) => (tally[d.status] += 1));
    return tally;
  }, [days]);

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function step(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
  }

  function openEditor(day: CalendarDay) {
    setEditing(day);
    setForm({
      status: day.status === "available" ? "blocked" : day.status,
      reason: day.reason ?? "",
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    setSaving(true);
    const res = await adminApi.put(`/admin/halls/${hallId}/availability`, {
      date: editing.date,
      status: form.status,
      reason: form.reason || undefined,
    });
    setSaving(false);

    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }

    toastSuccess(
      form.status === "available"
        ? `Override cleared for ${shortDate(editing.date)}.`
        : `${shortDate(editing.date)} marked ${form.status}.`
    );
    setEditing(null);
    void load();
  }

  return (
    <div className={cn("card", className)}>
      <div className="card-header">
        <div>
          <h2 className="card-title">Availability calendar</h2>
          <p className="card-subtitle">
            Click any date to hold it back or release it. Confirmed enquiries block their date
            automatically.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" icon={<ChevronLeft size={14} />} onClick={() => step(-1)} aria-label="Previous month" />
          <span className="min-w-[10rem] text-center text-base font-medium text-ink-800">
            {monthName}
          </span>
          <Button size="sm" icon={<ChevronRight size={14} />} onClick={() => step(1)} aria-label="Next month" />
        </div>
      </div>

      <div className="card-body">
        <div className="mb-5 flex flex-wrap items-start gap-2.5 rounded-lg border border-info-100 bg-info-50 px-4 py-2.5">
          <Info size={15} className="mt-0.5 shrink-0 text-info-600" />
          <p className="text-base text-info-700">
            Most cells are computed, not set by hand: a confirmed enquiry shows as{" "}
            <strong>booked</strong> and a pending one as <strong>tentative</strong>. A manual
            override always wins over both.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LEGEND.map((entry) => (
            <div
              key={entry.status}
              className={cn("rounded-lg border px-3 py-2.5", STATUS_CELL[entry.status])}
            >
              <p className="text-xl font-semibold tabular-nums">{counts[entry.status]}</p>
              <p className="text-xs font-medium">{entry.label}</p>
              <p className="text-xs opacity-75">{entry.hint}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
              <Loader2 size={18} className="animate-spin text-brand-600" />
            </div>
          )}

          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-ink-400">
                {d}
              </div>
            ))}

            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`blank-${i}`} aria-hidden />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const key = `${year}-${String(month).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
              const day = byDate.get(key) ?? { date: key, status: "available" as DateStatus };

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openEditor(day)}
                  title={day.reason || day.status}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors",
                    STATUS_CELL[day.status]
                  )}
                >
                  <span className="font-medium tabular-nums">{dayNumber}</span>
                  {day.reason && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-current opacity-60" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-danger-600">{error}</p>}
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? shortDate(editing.date) : "Date"}
        description={
          editing
            ? `Currently ${editing.status}${editing.reason ? ` — ${editing.reason}` : ""}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="hall-availability-form" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="hall-availability-form" onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-500">Current status:</span>
            <Badge
              tone={
                editing?.status === "booked"
                  ? "success"
                  : editing?.status === "tentative"
                    ? "warning"
                    : editing?.status === "blocked"
                      ? "danger"
                      : "neutral"
              }
            >
              {editing?.status}
            </Badge>
          </div>

          <Select
            label="Set status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as DateStatus })}
            hint="Choosing Available removes the manual override entirely. If a confirmed enquiry sits on this date, it will still read as booked afterwards."
          >
            <option value="available">Available — clear any override</option>
            <option value="tentative">Tentative — provisionally held</option>
            <option value="booked">Booked — the date is taken</option>
            <option value="blocked">Blocked — not offered at all</option>
          </Select>

          <TextInput
            label="Internal note"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Sharma wedding / annual maintenance"
            hint="Staff only — never shown to visitors."
            disabled={form.status === "available"}
          />

          {editing?.status === "booked" && editing.reason?.includes("7VH-") && (
            <p className="flex items-start gap-2 rounded-md border border-warning-100 bg-warning-50 px-3 py-2.5 text-sm text-warning-700">
              <CalendarOff size={14} className="mt-0.5 shrink-0" />
              This date was blocked by a confirmed enquiry. Changing the enquiry&apos;s status back
              from confirmed releases it automatically — prefer that over editing the date here.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
