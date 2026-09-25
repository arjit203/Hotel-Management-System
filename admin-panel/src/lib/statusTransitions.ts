/**
 * Which status an admin can move a record to next, per vertical.
 *
 * Mirrors the `ALLOWED_TRANSITIONS` maps the backend enforces on
 * `PUT /admin/{hotels/bookings|restaurants/reservations|halls/enquiries}/:id/status`,
 * so the dropdowns only offer moves that can succeed. The server stays the
 * authority: an illegal move still comes back as a 409 whose message the pages
 * show via `formatApiError`, so a drift between this file and the API degrades
 * to a clear toast, not a silent failure.
 */

// ── Hotel bookings ──────────────────────────────────────────────────────────
// Matches `ALLOWED_TRANSITIONS` in backend hotel/booking.service.ts. `no_show`
// is not in the hotel booking enum, so confirmed has no such exit, and the
// refund states are terminal for this endpoint.
const HOTEL_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: ["checked_out"],
  checked_out: ["completed"],
  refund_pending: [],
  completed: [],
  cancelled: [],
  refunded: [],
};

export function nextHotelStatuses(booking: { status: string; paymentStatus?: string }): string[] {
  const next = HOTEL_TRANSITIONS[booking.status] ?? [];
  // A pending booking can only be confirmed once the advance is actually paid —
  // confirmation otherwise happens through Razorpay signature verification.
  if (booking.status === "pending" && booking.paymentStatus !== "paid") {
    return next.filter((s) => s !== "confirmed");
  }
  return next;
}

// ── Restaurant reservations ─────────────────────────────────────────────────
// Reservations are created `confirmed` (instant); there is no `pending` state.
const RESERVATION_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["seated", "no_show", "cancelled", "completed"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function nextReservationStatuses(status: string): string[] {
  return RESERVATION_TRANSITIONS[status] ?? [];
}

// ── Marriage Hall enquiries ─────────────────────────────────────────────────
// A new enquiry is stored as `pending`. `confirmed → approved` undoes a
// mistaken confirmation (releasing the date); declined/cancelled are terminal.
const ENQUIRY_TRANSITIONS: Record<string, string[]> = {
  pending: ["reviewing", "approved", "declined", "cancelled"],
  reviewing: ["approved", "declined", "cancelled"],
  approved: ["confirmed", "declined", "cancelled"],
  confirmed: ["approved", "cancelled"],
  declined: [],
  cancelled: [],
};

export function nextEnquiryStatuses(status: string): string[] {
  return ENQUIRY_TRANSITIONS[status] ?? [];
}

/** Options for a status `<select>`: the current value first, then the legal moves. */
export function statusSelectOptions(current: string, next: string[]): string[] {
  return [current, ...next.filter((s) => s !== current)];
}
