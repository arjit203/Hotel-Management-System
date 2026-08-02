/**
 * Shared formatters.
 *
 * These were duplicated verbatim across five files (the confirmation page,
 * my-bookings, the room detail page, BookingForm and AnimatedNumber), each with
 * its own `toLocaleString("en-IN")` call and its own date options. Centralising
 * them means a rate or a date reads identically everywhere, and the locale is
 * changed in one place if the property ever needs another region.
 *
 * Vertical-agnostic — Marriage Hall and Restaurant should use these too.
 */

const LOCALE = "en-IN";

/** `2400` → `"₹2,400"`. Whole rupees; the backend stores integer amounts. */
export function money(amount: number): string {
  return `₹${amount.toLocaleString(LOCALE)}`;
}

/** `2400` → `"2,400"` — when the ₹ symbol is rendered separately. */
export function amount(value: number): string {
  return value.toLocaleString(LOCALE);
}

/** `"2026-05-05"` → `"05 May 2026"` — the invoice/table format. */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** `"2026-05-05"` → `"Tue, 5 May 2026"` — where the weekday helps the guest. */
export function formatDateLong(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** `"5 May 2026"` — compact, for dense lists. */
export function formatDateShort(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Whole nights between two dates.
 *
 * Mirrors the backend's own calculation (`calculateNights` in
 * booking.service.ts) so a displayed night count can never disagree with the
 * charged one. Floors at 1 for display purposes — the backend rejects a
 * zero-night booking before it is ever created.
 */
export function nightsBetween(checkIn: string | Date, checkOut: string | Date): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

/** `"today"` in `YYYY-MM-DD`, for `min` on date inputs. */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** First initial for monogram avatars. Falls back to "G" for guests. */
export function initial(name?: string): string {
  return (name || "G").trim().charAt(0).toUpperCase() || "G";
}
