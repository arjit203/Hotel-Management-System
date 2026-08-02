/**
 * Booking status chip.
 *
 * The `STATUS_STYLES` map was duplicated in the confirmation page and
 * my-bookings — the same eight statuses, the same eight class strings. Since the
 * status vocabulary is owned by the backend
 * (`updateBookingStatus` in booking.service.ts allows exactly these values), it
 * must be presented identically wherever it appears, and it is now defined once.
 *
 * Deliberately muted rather than saturated traffic-light colours: this appears on
 * a confirmation page directly after payment, and a loud green pill was the
 * least on-brand element there.
 *
 * A Server Component.
 */
const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-300/60 bg-amber-50 text-amber-800",
  confirmed: "border-gold/40 bg-gold/10 text-gold-dark",
  checked_in: "border-sky-300/60 bg-sky-50 text-sky-800",
  checked_out: "border-ink/15 bg-ink/[0.04] text-ink/70",
  completed: "border-ink/15 bg-ink/[0.04] text-ink/70",
  cancelled: "border-red-300/60 bg-red-50 text-red-700",
  refund_pending: "border-amber-300/60 bg-amber-50 text-amber-800",
  refunded: "border-ink/15 bg-ink/[0.04] text-ink/70",
};

const FALLBACK = "border-ink/15 bg-ink/[0.04] text-ink/70";

export default function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-luxe ${
        STATUS_STYLES[status] || FALLBACK
      } ${className}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
