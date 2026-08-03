import { HotelBooking } from "../hotel/models/hotelBooking.model";
import { TableReservation } from "../restaurant/models/tableReservation.model";
import { HallEnquiry } from "../hall/models/hallEnquiry.model";
import { Review } from "../content/models/review.model";
import { User } from "../auth/models/user.model";
import { Admin } from "../auth/models/admin.model";
import { scopeForAdmin, type ActivityModule } from "./activity.service";
import { ApiError } from "../../utils/apiError.util";

/**
 * Data collection for exports.
 *
 * ── Read-only, and deliberately so ──
 * Every function here queries and shapes. Nothing writes, nothing mutates a
 * booking, and the booking flow is untouched — an export is a report, and a
 * report that can change what it reports on is a liability.
 *
 * ── Why datasets are described rather than special-cased ──
 * Six exports × three formats is eighteen code paths if each is written by
 * hand. Instead a dataset declares its columns and how to fetch its rows, and
 * `export.format.ts` turns any dataset into CSV, Excel or PDF. Adding a seventh
 * export is one entry here, not three new writers.
 *
 * ── RBAC ──
 * Each dataset names the vertical it belongs to, and `assertAllowed` checks it
 * against the caller's `effectiveScope` — the same function the route guards
 * use. A restaurant manager exporting hotel bookings gets a 403 from the
 * service, not just a hidden button. Customers is Super-Admin-only: it is the
 * guest list of the entire estate in one file.
 */

export type ExportFormat = "csv" | "xlsx" | "pdf";

export type DatasetKey =
  | "bookings"
  | "customers"
  | "reviews"
  | "reservations"
  | "enquiries"
  | "revenue";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  /** Right-aligned in PDF/Excel and summed in the revenue footer. */
  numeric?: boolean;
}

export interface DatasetDefinition {
  key: DatasetKey;
  label: string;
  /** `null` = platform-wide, and therefore Super Admin only. */
  module: ActivityModule | null;
  columns: ExportColumn[];
  /** PDF is offered only where a page of columns is actually readable. */
  formats: ExportFormat[];
  description: string;
}

export const DATASETS: Record<DatasetKey, DatasetDefinition> = {
  bookings: {
    key: "bookings",
    label: "Hotel bookings",
    module: "hotel",
    formats: ["csv", "xlsx", "pdf"],
    description: "Every hotel booking in the window, with guest, dates, status and money.",
    columns: [
      { header: "Reference", key: "reference", width: 16 },
      { header: "Guest", key: "guest", width: 22 },
      { header: "Email", key: "email", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Check-in", key: "checkIn", width: 14 },
      { header: "Check-out", key: "checkOut", width: 14 },
      { header: "Nights", key: "nights", width: 8, numeric: true },
      { header: "Rooms", key: "rooms", width: 26 },
      { header: "Status", key: "status", width: 12 },
      { header: "Payment", key: "paymentStatus", width: 12 },
      { header: "Total", key: "total", width: 12, numeric: true },
      { header: "Advance paid", key: "advancePaid", width: 14, numeric: true },
      { header: "Booked on", key: "createdAt", width: 18 },
    ],
  },
  customers: {
    key: "customers",
    label: "Customers",
    module: null,
    formats: ["csv", "xlsx"],
    description:
      "Registered customer accounts. Guests who booked without an account are in the booking export instead.",
    columns: [
      { header: "Name", key: "name", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Email verified", key: "verified", width: 14 },
      { header: "Registered", key: "createdAt", width: 18 },
    ],
  },
  reviews: {
    key: "reviews",
    label: "Reviews",
    module: null,
    formats: ["csv", "xlsx", "pdf"],
    description: "Guest reviews across every vertical, approved and pending.",
    columns: [
      { header: "Vertical", key: "vertical", width: 12 },
      { header: "Guest", key: "guest", width: 20 },
      { header: "Rating", key: "rating", width: 8, numeric: true },
      { header: "Approved", key: "approved", width: 10 },
      { header: "Comment", key: "comment", width: 60 },
      { header: "Submitted", key: "createdAt", width: 18 },
    ],
  },
  reservations: {
    key: "reservations",
    label: "Restaurant reservations",
    module: "restaurant",
    formats: ["csv", "xlsx", "pdf"],
    description: "Table reservations with covers, slot and status.",
    columns: [
      { header: "Reference", key: "reference", width: 16 },
      { header: "Guest", key: "guest", width: 22 },
      { header: "Email", key: "email", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Date", key: "date", width: 14 },
      { header: "Slot", key: "slot", width: 12 },
      { header: "Covers", key: "partySize", width: 8, numeric: true },
      { header: "Area", key: "area", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Booked on", key: "createdAt", width: 18 },
    ],
  },
  enquiries: {
    key: "enquiries",
    label: "Hall enquiries",
    module: "hall",
    formats: ["csv", "xlsx", "pdf"],
    description:
      "Marriage Hall enquiries. These carry no amount — hall bookings are approval-first and unpriced online.",
    columns: [
      { header: "Reference", key: "reference", width: 16 },
      { header: "Guest", key: "guest", width: 22 },
      { header: "Email", key: "email", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Event date", key: "eventDate", width: 14 },
      { header: "Event type", key: "eventType", width: 18 },
      { header: "Guests", key: "guestCount", width: 8, numeric: true },
      { header: "Status", key: "status", width: 12 },
      { header: "Enquired on", key: "createdAt", width: 18 },
    ],
  },
  revenue: {
    key: "revenue",
    label: "Revenue report",
    module: "hotel",
    formats: ["csv", "xlsx", "pdf"],
    description:
      "Money actually received, by day. Hotel only — the restaurant takes no online payment and the hall is unpriced online.",
    columns: [
      { header: "Date", key: "date", width: 14 },
      { header: "Bookings paid", key: "count", width: 14, numeric: true },
      { header: "Advance received", key: "advance", width: 18, numeric: true },
      { header: "Booking value", key: "total", width: 18, numeric: true },
    ],
  },
};

export interface ExportRequest {
  dataset: DatasetKey;
  format: ExportFormat;
  from?: string;
  to?: string;
}

/**
 * Refuses a dataset the caller's role does not cover.
 *
 * Throws rather than returning empty: an export that silently produces a blank
 * file is worse than one that says no, because the person reads it as "there
 * were no bookings this month".
 */
export async function assertAllowed(adminId: string, dataset: DatasetKey): Promise<void> {
  const definition = DATASETS[dataset];
  if (!definition) throw new ApiError(404, "Unknown export.");

  const admin = await Admin.findById(adminId).select("role businessScope");
  if (!admin) throw new ApiError(401, "This account no longer exists.");

  if (definition.module === null) {
    if (admin.role !== "super_admin") {
      throw new ApiError(403, `Only a Super Admin can export ${definition.label.toLowerCase()}.`);
    }
    return;
  }

  if (!scopeForAdmin(admin).includes(definition.module)) {
    throw new ApiError(403, `Your role does not cover ${definition.label.toLowerCase()}.`);
  }
}

function dateRange(from?: string, to?: string): Record<string, Date> | null {
  if (!from && !to) return null;
  const range: Record<string, Date> = {};
  if (from) {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    range.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    range.$lte = d;
  }
  return range;
}

/** Hard ceiling so one click cannot try to stream a million rows into memory. */
const MAX_ROWS = 10_000;

export async function collectRows(request: ExportRequest): Promise<Record<string, unknown>[]> {
  const range = dateRange(request.from, request.to);
  const filter: Record<string, unknown> = range ? { createdAt: range } : {};

  switch (request.dataset) {
    case "bookings": {
      const rows = await HotelBooking.find(filter).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
      return (rows as any[]).map((b) => ({
        reference: b.bookingReference,
        guest: b.guestName,
        email: b.guestEmail,
        phone: b.guestPhone ?? "",
        checkIn: fmtDate(b.checkInDate),
        checkOut: fmtDate(b.checkOutDate),
        nights: nightsBetween(b.checkInDate, b.checkOutDate),
        rooms: (b.rooms ?? [])
          .map((r: any) => `${r.roomName ?? r.categoryName ?? "Room"} ×${r.quantity ?? 1}`)
          .join(", "),
        status: b.status,
        paymentStatus: b.paymentStatus ?? "—",
        total: b.totalAmount ?? 0,
        advancePaid: b.advancePaid ?? 0,
        createdAt: fmtDateTime(b.createdAt),
      }));
    }

    case "customers": {
      const rows = await User.find(filter).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
      return (rows as any[]).map((u) => ({
        name: u.name,
        email: u.email,
        phone: u.phone ?? "",
        verified: u.isEmailVerified ? "Yes" : "No",
        createdAt: fmtDateTime(u.createdAt),
      }));
    }

    case "reviews": {
      const rows = await Review.find(filter).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
      return (rows as any[]).map((r) => ({
        vertical: r.reviewableType,
        guest: r.guestName ?? "Guest",
        rating: r.rating,
        approved: r.isApproved ? "Yes" : "No",
        comment: r.comment,
        createdAt: fmtDateTime(r.createdAt),
      }));
    }

    case "reservations": {
      const rows = await TableReservation.find(filter).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
      return (rows as any[]).map((r) => ({
        reference: r.reservationReference,
        guest: r.guestName,
        email: r.guestEmail,
        phone: r.guestPhone,
        date: fmtDate(r.reservationDate),
        slot: r.timeSlot,
        partySize: r.partySize,
        area: r.diningAreaName,
        status: r.status,
        createdAt: fmtDateTime(r.createdAt),
      }));
    }

    case "enquiries": {
      const rows = await HallEnquiry.find(filter).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
      return (rows as any[]).map((e) => ({
        reference: e.reference,
        guest: e.guestName,
        email: e.guestEmail,
        phone: e.guestPhone ?? "",
        eventDate: fmtDate(e.eventDate),
        eventType: e.eventType,
        guestCount: e.guestCount,
        status: e.status,
        createdAt: fmtDateTime(e.createdAt),
      }));
    }

    case "revenue": {
      /**
       * Money *received*, not money invoiced.
       *
       * Filters on `paymentStatus: "paid"` and sums `advancePaid`, which is the
       * verified amount — `advanceRequired` is what was asked for, and counting
       * that as revenue would report income from bookings nobody paid for. The
       * balance is settled at the property and is not visible to this system,
       * which is why "Booking value" sits next to it as a separate column
       * rather than being added in.
       */
      const match: Record<string, unknown> = { paymentStatus: "paid" };
      if (range) match.updatedAt = range;

      const rows = await HotelBooking.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
            count: { $sum: 1 },
            advance: { $sum: "$advancePaid" },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: MAX_ROWS },
      ]);

      return rows.map((r: any) => ({
        date: r._id,
        count: r.count,
        advance: r.advance ?? 0,
        total: r.total ?? 0,
      }));
    }

    default:
      throw new ApiError(404, "Unknown export.");
  }
}

function fmtDate(value: Date | string | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function fmtDateTime(value: Date | string | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}

function nightsBetween(a: Date | string, b: Date | string): number {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}
