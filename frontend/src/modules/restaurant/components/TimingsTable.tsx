import { Clock } from "lucide-react";
import { WEEKDAYS, formatTimeSlot, type ServiceHoursData } from "@/lib/restaurant";

/**
 * Restaurant Timings — the weekly service schedule.
 *
 * Today's row is highlighted, because "are they open right now" is the actual
 * question a guest arrives with. Rendered from admin-managed `serviceHours` data,
 * never hardcoded.
 *
 * A Server Component — the "today" highlight is computed at render time, which is
 * accurate within the page's 60s revalidate window and costs no client JS.
 */
export default function TimingsTable({ serviceHours }: { serviceHours: ServiceHoursData[] }) {
  if (!serviceHours || serviceHours.length === 0) return null;

  const today = new Date().getDay();

  // Order Monday-first (the way an Indian restaurant lists its week), while the
  // stored dayOfWeek keeps JS's Sunday-first indexing.
  const ordered = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => serviceHours.find((h) => h.dayOfWeek === d))
    .filter((h): h is ServiceHoursData => Boolean(h));

  return (
    <div className="overflow-hidden rounded-luxe border border-ink/[0.07] bg-white shadow-luxury">
      <div className="flex items-center gap-2.5 border-b border-ink/[0.07] bg-cream/60 px-7 py-5">
        <Clock size={15} strokeWidth={1.5} className="text-gold" />
        <p className="text-xs uppercase tracking-luxe text-ink">Opening Hours</p>
      </div>

      <ul className="divide-y divide-ink/[0.06]">
        {ordered.map((h) => {
          const isToday = h.dayOfWeek === today;
          return (
            <li
              key={h.dayOfWeek}
              className={`flex items-center justify-between gap-4 px-7 py-4 ${
                isToday ? "bg-gold/[0.06]" : ""
              }`}
            >
              <span
                className={`text-sm ${isToday ? "font-medium text-ink" : "font-light text-warm-600"}`}
              >
                {WEEKDAYS[h.dayOfWeek]}
                {isToday && (
                  <span className="ml-2.5 text-xs uppercase tracking-luxe text-gold-dark">Today</span>
                )}
              </span>

              <span
                className={`text-sm tabular-nums ${
                  h.isClosed
                    ? "text-warm-500"
                    : isToday
                      ? "font-medium text-ink"
                      : "font-light text-warm-600"
                }`}
              >
                {h.isClosed
                  ? "Closed"
                  : `${formatTimeSlot(h.openTime)} – ${formatTimeSlot(h.closeTime)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
