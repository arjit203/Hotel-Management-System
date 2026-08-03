import { HotelBooking } from "../hotel/models/hotelBooking.model";
import { TableReservation } from "../restaurant/models/tableReservation.model";
import { HallEnquiry } from "../hall/models/hallEnquiry.model";
import { Review } from "../content/models/review.model";
import { Offer } from "../content/models/offer.model";
import { effectiveScope, type BusinessScope, type IAdmin } from "../auth/models/admin.model";

/**
 * The estate's activity feed — one chronological stream across Hotel,
 * Restaurant and Marriage Hall.
 *
 * ── Why this derives from the source collections instead of a feed table ──
 * The obvious design is an `Activity` collection written to whenever something
 * happens. That means a write inside `createHotelBooking`, `verifyPayment`,
 * `createReservation`, `createEnquiry` and the review path — five edits to
 * money-handling code, for a dashboard widget. The brief says not to modify the
 * existing APIs, and it is right to: a booking must not fail because a feed
 * insert did.
 *
 * Deriving costs five indexed, limited, projected queries in parallel, all
 * sorted on fields that already carry an index. Nothing is written anywhere, so
 * the feed cannot drift from reality, cannot double-count a retry, and needed
 * no backfill for the data that existed before this module did.
 *
 * ── One service, two features ──
 * The dashboard timeline and the notification centre are the same data seen
 * twice: the timeline shows everything, the bell shows the subset worth
 * interrupting someone for (`NOTIFIABLE_TYPES`). Building them separately would
 * have meant two sets of queries drifting out of step.
 */

export type ActivityType =
  | "booking_created"
  | "booking_cancelled"
  | "payment_received"
  | "reservation_created"
  | "reservation_cancelled"
  | "enquiry_created"
  | "review_submitted"
  | "offer_published";

export type ActivityModule = "hotel" | "restaurant" | "hall";

export interface ActivityItem {
  /**
   * Stable across reads — `type:sourceId`. The notification centre stores read
   * state against this, so it must not change between two calls or an item
   * would silently reappear as unread.
   */
  key: string;
  type: ActivityType;
  module: ActivityModule;
  title: string;
  detail: string;
  /** Where clicking the item should land in the admin panel. */
  href: string;
  at: Date;
  /** Rendering hint only — never an authorisation signal. */
  tone: "info" | "success" | "warning" | "brand";
  amount?: number;
  reference?: string;
}

/** The subset the bell raises. Everything else is timeline-only. */
export const NOTIFIABLE_TYPES: ActivityType[] = [
  "booking_created",
  "booking_cancelled",
  "payment_received",
  "reservation_created",
  "enquiry_created",
  "review_submitted",
];

export interface CollectOptions {
  /** Only activity at or after this instant. Defaults to 30 days ago. */
  since?: Date;
  /** Per-source cap before merging. The merged list is capped separately. */
  perSource?: number;
  limit?: number;
  modules?: ActivityModule[];
  types?: ActivityType[];
}

const DEFAULT_WINDOW_DAYS = 30;

/**
 * Which verticals this admin may see.
 *
 * Reuses `effectiveScope` rather than re-deriving from the role, so the feed
 * can never disagree with what the route guards allow. A Super Admin gets all
 * three; a hall manager's dashboard shows hall activity and nothing else.
 */
export function scopeForAdmin(admin: Pick<IAdmin, "role" | "businessScope">): ActivityModule[] {
  const scope: BusinessScope[] = effectiveScope(admin);
  return scope.filter((s): s is ActivityModule => s === "hotel" || s === "restaurant" || s === "hall");
}

export async function collectActivity(options: CollectOptions = {}): Promise<ActivityItem[]> {
  const since =
    options.since ?? new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const perSource = Math.min(200, options.perSource ?? 40);
  const limit = Math.min(300, options.limit ?? 40);
  const modules = options.modules ?? (["hotel", "restaurant", "hall"] as ActivityModule[]);

  const wants = (m: ActivityModule) => modules.includes(m);

  const [bookings, reservations, enquiries, reviews, offers] = await Promise.all([
    wants("hotel")
      ? HotelBooking.find({ updatedAt: { $gte: since } })
          .select("guestName bookingReference status paymentStatus totalAmount advancePaid createdAt updatedAt")
          .sort({ updatedAt: -1 })
          .limit(perSource)
          .lean()
      : [],
    wants("restaurant")
      ? TableReservation.find({ updatedAt: { $gte: since } })
          .select("guestName reservationReference status partySize reservationDate timeSlot createdAt updatedAt")
          .sort({ updatedAt: -1 })
          .limit(perSource)
          .lean()
      : [],
    wants("hall")
      ? HallEnquiry.find({ updatedAt: { $gte: since } })
          .select("guestName reference status eventType eventDate guestCount createdAt updatedAt")
          .sort({ updatedAt: -1 })
          .limit(perSource)
          .lean()
      : [],
    Review.find({ createdAt: { $gte: since } })
      .select("guestName reviewableType rating comment isApproved createdAt")
      .sort({ createdAt: -1 })
      .limit(perSource)
      .lean(),
    Offer.find({ createdAt: { $gte: since }, isActive: true })
      .select("title applicableTo createdAt")
      .sort({ createdAt: -1 })
      .limit(perSource)
      .lean(),
  ]);

  const items: ActivityItem[] = [];

  for (const b of bookings as any[]) {
    const id = String(b._id);
    const guest = b.guestName || "A guest";

    if (b.status === "cancelled") {
      items.push({
        key: `booking_cancelled:${id}`,
        type: "booking_cancelled",
        module: "hotel",
        title: `Booking cancelled — ${guest}`,
        detail: `${b.bookingReference} is no longer holding rooms.`,
        href: `/bookings?search=${encodeURIComponent(b.bookingReference)}`,
        at: b.updatedAt ?? b.createdAt,
        tone: "warning",
        reference: b.bookingReference,
      });
      continue;
    }

    // A paid booking is reported as the payment, not as a second creation
    // event — the money arriving is the thing anyone cares about.
    if (b.paymentStatus === "paid" && b.advancePaid > 0) {
      items.push({
        key: `payment_received:${id}`,
        type: "payment_received",
        module: "hotel",
        title: `Payment received — ${guest}`,
        detail: `Advance of ₹${Number(b.advancePaid).toLocaleString("en-IN")} confirmed against ${b.bookingReference}.`,
        href: `/bookings?search=${encodeURIComponent(b.bookingReference)}`,
        at: b.updatedAt ?? b.createdAt,
        tone: "success",
        amount: b.advancePaid,
        reference: b.bookingReference,
      });
    } else {
      items.push({
        key: `booking_created:${id}`,
        type: "booking_created",
        module: "hotel",
        title: `New booking — ${guest}`,
        detail:
          b.status === "pending"
            ? `${b.bookingReference} is awaiting payment; no room is held yet.`
            : `${b.bookingReference} · ₹${Number(b.totalAmount ?? 0).toLocaleString("en-IN")}`,
        href: `/bookings?search=${encodeURIComponent(b.bookingReference)}`,
        at: b.createdAt,
        tone: b.status === "pending" ? "warning" : "info",
        amount: b.totalAmount,
        reference: b.bookingReference,
      });
    }
  }

  for (const r of reservations as any[]) {
    const id = String(r._id);
    const guest = r.guestName || "A guest";
    const cancelled = r.status === "cancelled";

    items.push({
      key: `${cancelled ? "reservation_cancelled" : "reservation_created"}:${id}`,
      type: cancelled ? "reservation_cancelled" : "reservation_created",
      module: "restaurant",
      title: cancelled ? `Reservation cancelled — ${guest}` : `New reservation — ${guest}`,
      detail: `${r.partySize} cover${r.partySize === 1 ? "" : "s"} · ${formatDate(r.reservationDate)} at ${r.timeSlot}`,
      href: `/reservations?search=${encodeURIComponent(r.reservationReference)}`,
      at: (cancelled ? r.updatedAt : r.createdAt) ?? r.createdAt,
      tone: cancelled ? "warning" : "info",
      reference: r.reservationReference,
    });
  }

  for (const e of enquiries as any[]) {
    const id = String(e._id);
    items.push({
      key: `enquiry_created:${id}`,
      type: "enquiry_created",
      module: "hall",
      title: `Hall enquiry — ${e.guestName || "A guest"}`,
      detail: `${e.eventType} for ${e.guestCount} on ${formatDate(e.eventDate)} · ${e.status}`,
      href: `/enquiries?search=${encodeURIComponent(e.reference)}`,
      at: e.createdAt,
      // Pending is the one that needs a human — nothing is held until it is answered.
      tone: e.status === "pending" ? "warning" : "info",
      reference: e.reference,
    });
  }

  for (const rv of reviews as any[]) {
    const module = rv.reviewableType as ActivityModule;
    if (!wants(module)) continue;

    items.push({
      key: `review_submitted:${String(rv._id)}`,
      type: "review_submitted",
      module,
      title: `${rv.rating}★ review — ${rv.guestName || "A guest"}`,
      detail: rv.isApproved
        ? truncate(rv.comment, 90)
        : `Awaiting moderation · ${truncate(rv.comment, 70)}`,
      href: rv.isApproved ? "/reviews" : "/reviews?status=pending",
      at: rv.createdAt,
      tone: rv.isApproved ? "brand" : "warning",
    });
  }

  for (const o of offers as any[]) {
    // `applicableTo: "all"` is estate-wide; file it under hotel so it appears
    // once rather than three times, and only when hotel is in scope.
    const module: ActivityModule =
      o.applicableTo === "all" ? "hotel" : (o.applicableTo as ActivityModule);
    if (!wants(module)) continue;

    items.push({
      key: `offer_published:${String(o._id)}`,
      type: "offer_published",
      module,
      title: `Offer published — ${o.title}`,
      detail: o.applicableTo === "all" ? "Applies across the estate." : `Applies to ${o.applicableTo}.`,
      href: "/offers",
      at: o.createdAt,
      tone: "brand",
    });
  }

  const filtered = options.types ? items.filter((i) => options.types!.includes(i.type)) : items;

  return filtered
    .filter((i) => i.at && new Date(i.at) >= since)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function truncate(text: string | undefined, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
