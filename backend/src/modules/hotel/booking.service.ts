import crypto from "crypto";
import { HotelBooking } from "./models/hotelBooking.model";
import { getRoomById, getAvailableCount } from "./hotel.service";
import { getHotelById } from "./hotel.service";
import { ApiError } from "../../utils/apiError.util";
import { CreateBookingInput } from "./hotel.validation";
import { sendEmail, buildBookingConfirmationEmailHtml } from "../../utils/email.util";

function generateBookingReference(): string {
  // e.g. 7V-8F3A9C21 — short, human-shareable, collision-safe enough for this scale.
  return `7V-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function calculateNights(checkIn: Date, checkOut: Date): number {
  const msPerNight = 1000 * 60 * 60 * 24;
  return Math.round((checkOut.getTime() - checkIn.getTime()) / msPerNight);
}

/**
 * Creates a Hotel booking. Per RULES.md, hotel room bookings are INSTANT
 * (unlike Marriage Hall, which requires admin approval) — so this directly
 * moves to 'confirmed' status once availability is verified, no approval step.
 * Guest checkout is supported (userId is optional).
 */
export async function createHotelBooking(input: CreateBookingInput, userId?: string) {
  const hotel = await getHotelById(input.hotelId);
  const room = await getRoomById(input.roomId);

  if (String(room.hotelId) !== String(hotel._id)) {
    throw new ApiError(400, "This room does not belong to the specified hotel.");
  }

  const checkInDate = new Date(input.checkInDate);
  const checkOutDate = new Date(input.checkOutDate);
  const nights = calculateNights(checkInDate, checkOutDate);

  if (nights < 1) {
    throw new ApiError(400, "Booking must be for at least 1 night.");
  }

  if (input.numGuests > room.maxOccupancy * input.numRooms) {
    throw new ApiError(
      400,
      `This room type allows a maximum of ${room.maxOccupancy} guests per room.`
    );
  }

  // Availability check happens right before creating the booking to minimize
  // (not eliminate) race-condition risk. Full concurrency safety would require
  // a DB transaction / distributed lock — flagged as a follow-up hardening item
  // for the Booking Engine module, not solved at the Hotel-module level alone.
  const availableCount = await getAvailableCount(input.roomId, checkInDate, checkOutDate);
  if (availableCount < input.numRooms) {
    throw new ApiError(
      409,
      `Only ${availableCount} room(s) of this category are available for the selected dates.`
    );
  }

  const totalAmount = room.basePrice * nights * input.numRooms;
  const advancePaid = 0; // Payment integration is a later phase (per RULES.md) — booking is
  // created as 'confirmed' with full balance due, to be settled at check-in or once
  // the Payments module is built.
  const balanceDue = totalAmount - advancePaid;

  const booking = await HotelBooking.create({
    userId: userId || null,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    hotelId: input.hotelId,
    roomId: input.roomId,
    checkInDate,
    checkOutDate,
    numGuests: input.numGuests,
    numRooms: input.numRooms,
    status: "confirmed",
    totalAmount,
    advancePaid,
    balanceDue,
    specialRequest: input.specialRequest,
    bookingReference: generateBookingReference(),
  });

  await sendEmail({
    to: booking.guestEmail,
    subject: `Booking Confirmed — ${hotel.name} (${booking.bookingReference})`,
    html: buildBookingConfirmationEmailHtml({
      guestName: booking.guestName,
      hotelName: hotel.name,
      roomName: room.name,
      checkIn: checkInDate.toDateString(),
      checkOut: checkOutDate.toDateString(),
      bookingReference: booking.bookingReference,
      totalAmount: booking.totalAmount,
    }),
  });

  return booking;
}

export async function getBookingByReference(bookingReference: string) {
  const booking = await HotelBooking.findOne({ bookingReference });
  if (!booking) throw new ApiError(404, "Booking not found.");
  return booking;
}

export async function getBookingsForUser(userId: string) {
  return HotelBooking.find({ userId }).sort({ createdAt: -1 });
}

export async function listBookingsForAdmin(filters: { hotelId?: string; status?: string } = {}) {
  const query: Record<string, unknown> = {};
  if (filters.hotelId) query.hotelId = filters.hotelId;
  if (filters.status) query.status = filters.status;
  return HotelBooking.find(query).sort({ createdAt: -1 });
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const allowedStatuses = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid booking status.");
  }

  const booking = await HotelBooking.findByIdAndUpdate(bookingId, { status }, { new: true });
  if (!booking) throw new ApiError(404, "Booking not found.");
  return booking;
}
