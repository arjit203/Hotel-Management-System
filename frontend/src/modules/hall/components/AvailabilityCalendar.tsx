"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { EASE_LUXE } from "@/components/motion/variants";
import { getHallCalendar, type HallCalendarDay, type HallDateStatus } from "@/lib/hall";

/**
 * Monthly availability calendar.
 *
 * Fetches client-side and uncached — a date's status is exactly the thing that
 * changes as enquiries arrive, so a stale "available" is the worst possible
 * error this component could make.
 *
 * The four statuses come straight from the backend's computed calendar; nothing
 * is inferred here. `blocked` is presented to visitors as "unavailable" rather
 * than exposing the venue's internal reason for holding the date.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_STYLE: Record<HallDateStatus, string> = {
  available: "border-transparent bg-white text-ink hover:border-gold hover:shadow-luxury",
  tentative: "border-transparent bg-gold/15 text-gold-dark",
  booked: "border-transparent bg-ink/[0.06] text-warm-400 line-through",
  blocked: "border-transparent bg-ink/[0.06] text-warm-400 line-through",
};

const LEGEND: { status: HallDateStatus; label: string; swatch: string }[] = [
  { status: "available", label: "Available", swatch: "bg-white border border-ink/15" },
  { status: "tentative", label: "Enquiry in progress", swatch: "bg-gold/35" },
  { status: "booked", label: "Booked", swatch: "bg-ink/15" },
];

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today as YYYY-MM-DD in local time — matches the keys the API returns. */
function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AvailabilityCalendar({
  hallSlug,
  /** Days the venue needs before an event; earlier dates aren't selectable. */
  minimumNoticeDays = 0,
  selectedDate,
  onSelectDate,
  className,
}: {
  hallSlug: string;
  minimumNoticeDays?: number;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  className?: string;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<HallCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await getHallCalendar(hallSlug, year, month, 1);
    if (data) setDays(data.days);
    else setError("We couldn't load the calendar just now. Please call us to check your date.");
    setLoading(false);
  }, [hallSlug, year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusByDate = useMemo(() => {
    const map = new Map<string, HallDateStatus>();
    days.forEach((d) => map.set(d.date, d.status));
    return map;
  }, [days]);

  /** Earliest date the venue will accept, as a comparable YYYY-MM-DD key. */
  const earliestKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + minimumNoticeDays);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, [minimumNoticeDays]);

  // Leading blanks so the 1st lands under the right weekday.
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = todayKey();

  // Don't let visitors page back into months that are entirely in the past.
  const atEarliestMonth = year === now.getFullYear() && month === now.getMonth() + 1;

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

  return (
    <div className={className}>
      {/* ── Month header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => step(-1)}
          disabled={atEarliestMonth}
          aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/12
                     text-ink transition-all duration-400 ease-luxe
                     hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={17} strokeWidth={1.5} />
        </button>

        <motion.p
          key={`${year}-${month}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_LUXE }}
          className="font-display text-2xl text-ink"
        >
          {monthLabel(year, month)}
        </motion.p>

        <button
          onClick={() => step(1)}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/12
                     text-ink transition-all duration-400 ease-luxe hover:border-gold hover:text-gold"
        >
          <ChevronRight size={17} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Grid ── */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream/70 backdrop-blur-[2px]">
            <Loader2 size={20} className="animate-spin text-gold" />
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid" aria-label={monthLabel(year, month)}>
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-2 text-center text-[10px] uppercase tracking-luxe text-warm-400"
            >
              {/* Single letter on the narrowest screens so cells stay square. */}
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day[0]}</span>
            </div>
          ))}

          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`blank-${i}`} aria-hidden="true" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNumber = i + 1;
            const key = `${year}-${String(month).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
            const status = statusByDate.get(key) ?? "available";
            const isPast = key < today;
            const tooSoon = key < earliestKey;
            const isSelectable = status === "available" && !isPast && !tooSoon;
            const isSelected = selectedDate === key;
            const isToday = key === today;

            return (
              <button
                key={key}
                type="button"
                role="gridcell"
                disabled={!isSelectable}
                onClick={() => isSelectable && onSelectDate?.(key)}
                aria-label={`${dayNumber} ${monthLabel(year, month)} — ${
                  isPast ? "past" : tooSoon ? "too soon to book" : status
                }`}
                aria-pressed={isSelected}
                className={`relative aspect-square rounded-lg border text-sm font-light
                            transition-all duration-300 ease-luxe
                            ${
                              isPast || tooSoon
                                ? "cursor-not-allowed border-transparent bg-transparent text-warm-400/40"
                                : STATUS_STYLE[status]
                            }
                            ${isSelected ? "!border-gold !bg-gold !text-ink shadow-gold" : ""}
                            ${isSelectable ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {dayNumber}
                {isToday && !isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-center text-sm font-light text-warm-500">{error}</p>
      )}

      {/* ── Legend ── */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
        {LEGEND.map((entry) => (
          <span key={entry.status} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-sm ${entry.swatch}`} aria-hidden="true" />
            <span className="text-xs uppercase tracking-luxe text-warm-500">{entry.label}</span>
          </span>
        ))}
      </div>

      {minimumNoticeDays > 0 && (
        <p className="mt-4 text-center text-xs font-light leading-relaxed text-warm-400">
          We ask for at least {minimumNoticeDays} days&apos; notice. For a date sooner than that,
          please call us directly — we will always try.
        </p>
      )}
    </div>
  );
}
