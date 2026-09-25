import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import {
  TableReservation,
  ITableReservation,
  ReservationStatus,
} from "./models/tableReservation.model";
import {
  getRestaurantById,
  getDiningAreaById,
  getAvailableTables,
  tablesNeededFor,
  startOfDayUTC,
  isSlotInPast,
  nowInIST,
} from "./restaurant.service";
import { getStoredSettingValue } from "../settings/settings.service";
import { ApiError } from "../../utils/apiError.util";
import {
  sendEmail,
  buildReservationConfirmationEmailHtml,
  buildReservationCancellationEmailHtml,
} from "../../utils/email.util";
import { CreateReservationInput } from "./restaurant.validation";

/**
 * Table reservation service.
 *
 * Two rules from RULES.md §2 shape everything here:
 *
 *  • **Instant.** A reservation is created directly as `confirmed`. There is no
 *    admin-approval step — that belongs to Marriage Hall.
 *  • **No payment.** No Razorpay, no advance, no invoice. Holding a table is free,
 *    and food ordering/payment is Phase 2.
 *
 * Guest checkout is supported (`userId` optional), mirroring HotelBooking.
 */

function generateReservationReference(): string {
  // 7VR- prefix distinguishes a restaurant reservation from a hotel booking's
  // 7V- reference at a glance, for both guests and reception staff.
  return `7VR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Admin-saved override first, then `.env`. */
async function adminNotificationEmail(): Promise<string | undefined> {
  const stored = await getStoredSettingValue("email", "adminNotificationEmail");
  return (typeof stored === "string" && stored.trim()) || process.env.ADMIN_NOTIFICATION_EMAIL;
}

/** `rahul@gmail.com` → `ra***@gm***.com`. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = String(email || "").split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, 2)}***@${host.slice(0, 2)}***${tld}`;
}

/** Keeps only the last 3 digits: `+91 98765 43210` → `*********210`. */
export function maskPhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length <= 3) return "***";
  return `${"*".repeat(digits.length - 3)}${digits.slice(-3)}`;
}

/**
 * What the public reference lookup returns.
 *
 * The reference is printed on emails and shared with family, so it is not proof
 * of identity. Unless the request carries the owning user's token, contact
 * details come back masked and `userId` is dropped. Field names are unchanged so
 * the confirmation page renders the same.
 */
export function toPublicReservation(reservation: ITableReservation, actorId?: string) {
  const obj = reservation.toObject() as Record<string, unknown>;
  const isOwner =
    Boolean(actorId) && Boolean(reservation.userId) && String(reservation.userId) === String(actorId);
  if (isOwner) return obj;

  delete obj.userId;
  delete obj.__v;
  obj.guestEmail = maskEmail(reservation.guestEmail);
  obj.guestPhone = maskPhone(reservation.guestPhone);
  return obj;
}

export async function createReservation(input: CreateReservationInput, userId?: string) {
  // Admin kill switch in Settings → Booking. Only an explicit `false` disables;
  // an unset value keeps reservations open.
  if ((await getStoredSettingValue("booking", "restaurantEnabled")) === false) {
    throw new ApiError(403, "Online table reservations are currently unavailable. Please call us.");
  }

  const restaurant = await getRestaurantById(input.restaurantId);
  const area = await getDiningAreaById(input.diningAreaId);

  if (String(area.restaurantId) !== String(restaurant._id)) {
    throw new ApiError(400, `"${area.name}" does not belong to this restaurant.`);
  }

  // The slot must be one the restaurant actually offers. This is why
  // reservationSlots is admin-configured data rather than a hardcoded range.
  if (!restaurant.reservationSlots.includes(input.timeSlot)) {
    throw new ApiError(
      400,
      `${input.timeSlot} is not a bookable sitting. Available: ${restaurant.reservationSlots.join(", ") || "none configured"}.`
    );
  }

  // "Today" and "now" are the restaurant's (IST), not the server's.
  const day = startOfDayUTC(new Date(input.reservationDate));
  if (day < nowInIST().today) {
    throw new ApiError(400, "Reservations cannot be made for a past date.");
  }
  if (isSlotInPast(day, input.timeSlot)) {
    throw new ApiError(
      400,
      `The ${input.timeSlot} sitting today has already started. Please choose a later sitting.`
    );
  }

  // The restaurant may be closed that weekday.
  const hours = restaurant.serviceHours.find((h) => h.dayOfWeek === day.getUTCDay());
  if (hours?.isClosed) {
    throw new ApiError(409, `${restaurant.name} is closed on that day.`);
  }

  if (input.partySize > restaurant.maxPartySize) {
    throw new ApiError(
      400,
      `For parties over ${restaurant.maxPartySize}, please call us on ${restaurant.contactPhone} so we can arrange it properly.`
    );
  }
  if (input.partySize < area.minPartySize) {
    throw new ApiError(400, `"${area.name}" seats a minimum of ${area.minPartySize} guests.`);
  }

  const tablesNeeded = tablesNeededFor(input.partySize, area.maxPartySize);
  const available = await getAvailableTables(
    input.diningAreaId,
    day,
    input.timeSlot,
    restaurant.reservationDurationMinutes
  );

  if (available < tablesNeeded) {
    throw new ApiError(
      409,
      available === 0
        ? `"${area.name}" is fully booked at ${input.timeSlot}. Please try another sitting.`
        : `"${area.name}" has only ${available} table(s) free at ${input.timeSlot}; a party of ${input.partySize} needs ${tablesNeeded}.`
    );
  }

  // Same race-condition caveat as the Hotel module's booking creation: the check
  // above and the create below are not a single transaction, so two simultaneous
  // requests for the last table could both succeed. Deferred to the shared
  // Booking Engine hardening item in PROJECT_DOCUMENTATION.md rather than solved
  // ad hoc here, so both verticals get the same fix.
  const reservation = await TableReservation.create({
    userId: userId || null,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    restaurantId: restaurant._id,
    diningAreaId: area._id,
    diningAreaName: area.name,
    reservationDate: day,
    timeSlot: input.timeSlot,
    partySize: input.partySize,
    tablesReserved: tablesNeeded,
    status: "confirmed",
    reservationReference: generateReservationReference(),
    specialRequest: input.specialRequest,
    occasion: input.occasion,
  });

  // Fire-and-forget: a slow or failing mail server must not fail or delay a
  // reservation that has already been saved.
  void sendEmail({
    to: reservation.guestEmail,
    subject: `Table Confirmed — ${restaurant.name} (${reservation.reservationReference})`,
    html: buildReservationConfirmationEmailHtml({
      guestName: reservation.guestName,
      restaurantName: restaurant.name,
      diningAreaName: reservation.diningAreaName,
      date: reservation.reservationDate.toDateString(),
      timeSlot: reservation.timeSlot,
      partySize: reservation.partySize,
      reservationReference: reservation.reservationReference,
      restaurantAddress: restaurant.address,
      restaurantPhone: restaurant.contactPhone,
    }),
  }).catch(() => undefined);

  return reservation;
}

export async function getReservationByReference(reservationReference: string) {
  const reservation = await TableReservation.findOne({ reservationReference });
  if (!reservation) throw new ApiError(404, "Reservation not found.");
  return reservation;
}

export async function getReservationsForUser(userId: string) {
  return TableReservation.find({ userId }).sort({ reservationDate: -1 });
}

export async function listReservationsForAdmin(
  filters: { restaurantId?: string; status?: string; date?: string } = {},
  paging: { skip: number; limit: number } = { skip: 0, limit: 200 }
) {
  const query: Record<string, unknown> = {};
  if (filters.restaurantId) {
    if (!isValidObjectId(filters.restaurantId)) return { items: [], total: 0 };
    query.restaurantId = filters.restaurantId;
  }
  if (filters.status) query.status = String(filters.status);
  if (filters.date) {
    const d = new Date(filters.date);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, "Invalid date filter.");
    query.reservationDate = startOfDayUTC(d);
  }
  const [items, total] = await Promise.all([
    TableReservation.find(query)
      .sort({ reservationDate: -1, timeSlot: 1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    TableReservation.countDocuments(query),
  ]);
  return { items, total };
}

const ACTIVE_STATUSES: ReservationStatus[] = ["confirmed", "seated"];

/**
 * The reservation lifecycle. A reservation is created `confirmed` (there is no
 * pending state — see the model), and every other status is terminal.
 * Cancelled / no-show / completed records are never reactivated: the table may
 * already have gone to someone else, so the guest re-books instead.
 */
const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  confirmed: ["seated", "no_show", "cancelled", "completed"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export async function updateReservationStatus(reservationId: string, status: string) {
  if (!(status in ALLOWED_TRANSITIONS)) throw new ApiError(400, "Invalid reservation status.");
  const next = status as ReservationStatus;

  if (!isValidObjectId(reservationId)) throw new ApiError(404, "Reservation not found.");
  const current = await TableReservation.findById(reservationId);
  if (!current) throw new ApiError(404, "Reservation not found.");

  // Re-sending the current status is a no-op, so a double click or a bulk
  // action that includes already-updated rows doesn't error.
  if (current.status === next) return current;

  if (!ALLOWED_TRANSITIONS[current.status].includes(next)) {
    const terminal = ALLOWED_TRANSITIONS[current.status].length === 0;
    throw new ApiError(
      409,
      terminal
        ? `This reservation is already ${current.status.replace("_", "-")} and can't be changed. Please create a new reservation instead.`
        : `A ${current.status} reservation can't be moved to ${next.replace("_", "-")}.`
    );
  }

  // Moving back into an active state would take tables again, so capacity must
  // still be there. (No transition in the map above does this today; the check
  // keeps the rule true if one is ever added.)
  if (!ACTIVE_STATUSES.includes(current.status) && ACTIVE_STATUSES.includes(next)) {
    const restaurant = await getRestaurantById(String(current.restaurantId));
    const available = await getAvailableTables(
      String(current.diningAreaId),
      current.reservationDate,
      current.timeSlot,
      restaurant.reservationDurationMinutes
    );
    if (available < current.tablesReserved) {
      throw new ApiError(
        409,
        `Not enough free tables at ${current.timeSlot} to reinstate this reservation.`
      );
    }
  }

  // Conditional on the status we validated against, so two admins acting at
  // once can't both apply a transition from the same starting point.
  const reservation = await TableReservation.findOneAndUpdate(
    { _id: current._id, status: current.status },
    { status: next, ...(next === "cancelled" ? { cancelledAt: new Date() } : {}) },
    { new: true }
  );
  if (!reservation) {
    throw new ApiError(409, "This reservation was just updated by someone else. Please refresh and try again.");
  }
  return reservation;
}

/**
 * Guest-initiated cancellation.
 *
 * No refund logic — nothing was charged. Ownership is proved by matching the
 * booking email or the logged-in user, never by the reference alone (which is
 * shareable). Same policy as the Hotel module's cancelBooking.
 */
export async function cancelReservation(
  reservationReference: string,
  requester: { guestEmail?: string; userId?: string },
  cancellationReason?: string
) {
  const reservation = await getReservationByReference(reservationReference);

  if (reservation.status === "cancelled") {
    throw new ApiError(409, "This reservation has already been cancelled.");
  }
  if (["seated", "completed", "no_show"].includes(reservation.status)) {
    throw new ApiError(409, "This reservation can no longer be cancelled.");
  }

  const isOwner =
    (requester.userId &&
      reservation.userId &&
      String(reservation.userId) === String(requester.userId)) ||
    (requester.guestEmail &&
      reservation.guestEmail.toLowerCase() === requester.guestEmail.toLowerCase());
  if (!isOwner) {
    throw new ApiError(403, "You are not authorised to cancel this reservation.");
  }

  if (startOfDayUTC(new Date(reservation.reservationDate)) < nowInIST().today) {
    throw new ApiError(400, "Only upcoming reservations can be cancelled.");
  }

  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancellationReason = cancellationReason;
  await reservation.save();

  const restaurant = await getRestaurantById(String(reservation.restaurantId));

  void sendEmail({
    to: reservation.guestEmail,
    subject: `Reservation Cancelled — ${restaurant.name} (${reservation.reservationReference})`,
    html: buildReservationCancellationEmailHtml({
      guestName: reservation.guestName,
      restaurantName: restaurant.name,
      reservationReference: reservation.reservationReference,
      date: reservation.reservationDate.toDateString(),
      timeSlot: reservation.timeSlot,
    }),
  }).catch(() => undefined);

  // Admin notification reuses the same sendEmail utility and the same
  // ADMIN_NOTIFICATION_EMAIL variable the Hotel module already uses (an address
  // saved in Settings → Email wins over it) — no new email infrastructure.
  const adminEmail = await adminNotificationEmail();
  if (adminEmail) {
    void sendEmail({
      to: adminEmail,
      subject: `[Cancellation] ${restaurant.name} — ${reservation.reservationReference}`,
      html: buildReservationCancellationEmailHtml({
        guestName: reservation.guestName,
        restaurantName: restaurant.name,
        reservationReference: reservation.reservationReference,
        date: reservation.reservationDate.toDateString(),
        timeSlot: reservation.timeSlot,
        forAdmin: true,
        guestEmail: reservation.guestEmail,
        partySize: reservation.partySize,
      }),
    }).catch(() => undefined);
  } else {
    console.log(
      `📋 [Admin notification — ADMIN_NOTIFICATION_EMAIL not set] Reservation ${reservation.reservationReference} at ${restaurant.name} (${reservation.partySize} guests, ${reservation.timeSlot}) was cancelled by ${reservation.guestEmail}.`
    );
  }

  return reservation;
}
