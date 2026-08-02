import crypto from "crypto";
import { TableReservation } from "./models/tableReservation.model";
import {
  getRestaurantById,
  getDiningAreaById,
  getAvailableTables,
  tablesNeededFor,
  startOfDayUTC,
} from "./restaurant.service";
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

export async function createReservation(input: CreateReservationInput, userId?: string) {
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

  const day = startOfDayUTC(new Date(input.reservationDate));
  if (day < startOfDayUTC(new Date())) {
    throw new ApiError(400, "Reservations cannot be made for a past date.");
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
  const available = await getAvailableTables(input.diningAreaId, day, input.timeSlot);

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

  await sendEmail({
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
  });

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
  filters: { restaurantId?: string; status?: string; date?: string } = {}
) {
  const query: Record<string, unknown> = {};
  if (filters.restaurantId) query.restaurantId = filters.restaurantId;
  if (filters.status) query.status = filters.status;
  if (filters.date) query.reservationDate = startOfDayUTC(new Date(filters.date));
  return TableReservation.find(query).sort({ reservationDate: -1, timeSlot: 1 });
}

export async function updateReservationStatus(reservationId: string, status: string) {
  const allowed = ["confirmed", "seated", "completed", "cancelled", "no_show"];
  if (!allowed.includes(status)) throw new ApiError(400, "Invalid reservation status.");

  const reservation = await TableReservation.findByIdAndUpdate(
    reservationId,
    { status, ...(status === "cancelled" ? { cancelledAt: new Date() } : {}) },
    { new: true }
  );
  if (!reservation) throw new ApiError(404, "Reservation not found.");
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

  if (startOfDayUTC(new Date(reservation.reservationDate)) < startOfDayUTC(new Date())) {
    throw new ApiError(400, "Only upcoming reservations can be cancelled.");
  }

  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancellationReason = cancellationReason;
  await reservation.save();

  const restaurant = await getRestaurantById(String(reservation.restaurantId));

  await sendEmail({
    to: reservation.guestEmail,
    subject: `Reservation Cancelled — ${restaurant.name} (${reservation.reservationReference})`,
    html: buildReservationCancellationEmailHtml({
      guestName: reservation.guestName,
      restaurantName: restaurant.name,
      reservationReference: reservation.reservationReference,
      date: reservation.reservationDate.toDateString(),
      timeSlot: reservation.timeSlot,
    }),
  });

  // Admin notification reuses the same sendEmail utility and the same
  // ADMIN_NOTIFICATION_EMAIL variable the Hotel module already uses — no new
  // email infrastructure, no new env var.
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendEmail({
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
    });
  } else {
    console.log(
      `📋 [Admin notification — ADMIN_NOTIFICATION_EMAIL not set] Reservation ${reservation.reservationReference} at ${restaurant.name} (${reservation.partySize} guests, ${reservation.timeSlot}) was cancelled by ${reservation.guestEmail}.`
    );
  }

  return reservation;
}
