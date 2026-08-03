import { HotelBooking } from "../hotel/models/hotelBooking.model";
import { Room } from "../hotel/models/room.model";
import { TableReservation } from "../restaurant/models/tableReservation.model";
import { HallEnquiry } from "../hall/models/hallEnquiry.model";
import { Review } from "../content/models/review.model";
import { Offer } from "../content/models/offer.model";
import { Faq } from "../content/models/faq.model";
import { User } from "../auth/models/user.model";
import { Admin } from "../auth/models/admin.model";
import { scopeForAdmin, type ActivityModule } from "./activity.service";
import { ApiError } from "../../utils/apiError.util";

/**
 * Global search across the admin console.
 *
 * ── Why regex and not a text index ──
 * Every useful query here is a *prefix or fragment* of an identifier: half a
 * booking reference, the first few letters of a surname, part of a phone
 * number. MongoDB's `$text` index tokenises on words and would not match
 * "7V-4A2" against "7V-4A2B91C" at all, which is the single most common thing
 * anyone will type into this box. Anchored regexes are also index-eligible;
 * unanchored ones are not, but every collection here is bounded by one property
 * and capped at `PER_GROUP` results.
 *
 * If these collections grow past a few hundred thousand rows, the upgrade is
 * Atlas Search, not `$text` — same fragment-matching behaviour, actually
 * indexed.
 *
 * ── RBAC ──
 * Groups are filtered by the caller's `effectiveScope`, the same function the
 * route guards use. A restaurant manager searching "Sharma" gets their own
 * reservations and reviews and nothing from the hotel's guest list. Customers
 * and admin accounts are Super-Admin-only, because a guest list is the most
 * sensitive thing in the database and a manager has no operational need for the
 * whole of it.
 */

const PER_GROUP = 6;
const MIN_QUERY = 2;

export type SearchGroupKey =
  | "customers"
  | "bookings"
  | "rooms"
  | "reservations"
  | "enquiries"
  | "reviews"
  | "offers"
  | "faqs"
  | "admins";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}

export interface SearchGroup {
  key: SearchGroupKey;
  label: string;
  module: ActivityModule | "platform";
  results: SearchResult[];
}

/** Escapes regex metacharacters so a search for "(" cannot break the query. */
function rx(term: string): RegExp {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

export async function globalSearch(
  adminId: string,
  rawQuery: string
): Promise<{ query: string; groups: SearchGroup[]; total: number }> {
  const query = (rawQuery || "").trim();
  if (query.length < MIN_QUERY) {
    return { query, groups: [], total: 0 };
  }

  const admin = await Admin.findById(adminId).select("role businessScope");
  if (!admin) throw new ApiError(401, "This account no longer exists.");

  const modules = scopeForAdmin(admin);
  const isSuperAdmin = admin.role === "super_admin";
  const term = rx(query);
  const wants = (m: ActivityModule) => modules.includes(m);

  const [customers, bookings, rooms, reservations, enquiries, reviews, offers, faqs, admins] =
    await Promise.all([
      isSuperAdmin
        ? User.find({ $or: [{ name: term }, { email: term }, { phone: term }] })
            .select("name email phone")
            .limit(PER_GROUP)
            .lean()
        : [],
      wants("hotel")
        ? HotelBooking.find({
            $or: [{ bookingReference: term }, { guestName: term }, { guestEmail: term }],
          })
            .select("bookingReference guestName guestEmail status checkInDate")
            .sort({ createdAt: -1 })
            .limit(PER_GROUP)
            .lean()
        : [],
      wants("hotel")
        ? Room.find({ $or: [{ name: term }, { slug: term }, { categoryName: term }], isActive: true })
            .select("name slug categoryName hotelId basePrice")
            .limit(PER_GROUP)
            .lean()
        : [],
      wants("restaurant")
        ? TableReservation.find({
            $or: [{ reservationReference: term }, { guestName: term }, { guestEmail: term }, { guestPhone: term }],
          })
            .select("reservationReference guestName status reservationDate partySize")
            .sort({ createdAt: -1 })
            .limit(PER_GROUP)
            .lean()
        : [],
      wants("hall")
        ? HallEnquiry.find({
            $or: [{ reference: term }, { guestName: term }, { guestEmail: term }, { eventType: term }],
          })
            .select("reference guestName status eventType eventDate")
            .sort({ createdAt: -1 })
            .limit(PER_GROUP)
            .lean()
        : [],
      Review.find({ $or: [{ guestName: term }, { comment: term }] })
        .select("guestName comment rating reviewableType isApproved")
        .sort({ createdAt: -1 })
        .limit(PER_GROUP * 2)
        .lean(),
      Offer.find({ $or: [{ title: term }, { description: term }] })
        .select("title applicableTo isActive validTo")
        .limit(PER_GROUP * 2)
        .lean(),
      Faq.find({ $or: [{ question: term }, { answer: term }] })
        .select("question applicableTo")
        .limit(PER_GROUP * 2)
        .lean(),
      isSuperAdmin
        ? Admin.find({ $or: [{ name: term }, { email: term }] })
            .select("name email role isActive")
            .limit(PER_GROUP)
            .lean()
        : [],
    ]);

  const groups: SearchGroup[] = [];

  push(groups, {
    key: "bookings",
    label: "Hotel bookings",
    module: "hotel",
    results: (bookings as any[]).map((b) => ({
      id: String(b._id),
      title: `${b.guestName} · ${b.bookingReference}`,
      subtitle: `${b.status} · arriving ${formatDate(b.checkInDate)}`,
      href: `/bookings?search=${encodeURIComponent(b.bookingReference)}`,
      badge: b.status,
    })),
  });

  push(groups, {
    key: "reservations",
    label: "Table reservations",
    module: "restaurant",
    results: (reservations as any[]).map((r) => ({
      id: String(r._id),
      title: `${r.guestName} · ${r.reservationReference}`,
      subtitle: `${r.partySize} covers · ${formatDate(r.reservationDate)}`,
      href: `/reservations?search=${encodeURIComponent(r.reservationReference)}`,
      badge: r.status,
    })),
  });

  push(groups, {
    key: "enquiries",
    label: "Hall enquiries",
    module: "hall",
    results: (enquiries as any[]).map((e) => ({
      id: String(e._id),
      title: `${e.guestName} · ${e.reference}`,
      subtitle: `${e.eventType} on ${formatDate(e.eventDate)}`,
      href: `/enquiries?search=${encodeURIComponent(e.reference)}`,
      badge: e.status,
    })),
  });

  push(groups, {
    key: "rooms",
    label: "Rooms",
    module: "hotel",
    results: (rooms as any[]).map((r) => ({
      id: String(r._id),
      title: r.name,
      subtitle: `${r.categoryName ?? "Room"} · ₹${Number(r.basePrice ?? 0).toLocaleString("en-IN")} a night`,
      href: `/hotels/${String(r.hotelId)}/rooms/${String(r._id)}`,
    })),
  });

  push(groups, {
    key: "customers",
    label: "Customers",
    module: "platform",
    results: (customers as any[]).map((u) => ({
      id: String(u._id),
      title: u.name,
      subtitle: [u.email, u.phone].filter(Boolean).join(" · "),
      href: `/customers?search=${encodeURIComponent(u.email || u.name)}`,
    })),
  });

  // Reviews, offers and FAQs are polymorphic — filter to the caller's verticals
  // in memory, since the vertical lives in a discriminator field rather than in
  // separate collections.
  push(groups, {
    key: "reviews",
    label: "Reviews",
    module: "platform",
    results: (reviews as any[])
      .filter((r) => modules.includes(r.reviewableType))
      .slice(0, PER_GROUP)
      .map((r) => ({
        id: String(r._id),
        title: `${r.rating}★ ${r.guestName || "Guest"}`,
        subtitle: truncate(r.comment, 70),
        href: r.isApproved ? "/reviews" : "/reviews?status=pending",
        badge: r.isApproved ? undefined : "pending",
      })),
  });

  push(groups, {
    key: "offers",
    label: "Offers",
    module: "platform",
    results: (offers as any[])
      .filter((o) => o.applicableTo === "all" || modules.includes(o.applicableTo))
      .slice(0, PER_GROUP)
      .map((o) => ({
        id: String(o._id),
        title: o.title,
        subtitle: `${o.applicableTo} · ${o.isActive ? "live" : "inactive"}`,
        href: "/offers",
        badge: o.isActive ? undefined : "inactive",
      })),
  });

  push(groups, {
    key: "faqs",
    label: "FAQs",
    module: "platform",
    results: (faqs as any[])
      // FAQ's estate-wide value is "general"; Offer's is "all". Different enums,
      // both meaning "not tied to one vertical".
      .filter((f) => f.applicableTo === "general" || modules.includes(f.applicableTo))
      .slice(0, PER_GROUP)
      .map((f) => ({
        id: String(f._id),
        title: truncate(f.question, 70),
        subtitle: String(f.applicableTo),
        href: "/faqs",
      })),
  });

  push(groups, {
    key: "admins",
    label: "Admin accounts",
    module: "platform",
    results: (admins as any[]).map((a) => ({
      id: String(a._id),
      title: a.name,
      subtitle: `${a.email} · ${a.role.replace(/_/g, " ")}`,
      href: "/users",
      badge: a.isActive ? undefined : "inactive",
    })),
  });

  const total = groups.reduce((sum, g) => sum + g.results.length, 0);
  return { query, groups, total };
}

/** Empty groups are dropped so the UI never renders a heading with nothing under it. */
function push(groups: SearchGroup[], group: SearchGroup) {
  if (group.results.length > 0) groups.push(group);
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function truncate(text: string | undefined, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
