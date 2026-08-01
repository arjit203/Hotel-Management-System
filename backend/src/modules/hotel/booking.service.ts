import crypto from "crypto";
import { HotelBooking } from "./models/hotelBooking.model";
import { getRoomById, getAvailableCount } from "./hotel.service";
import { getHotelById } from "./hotel.service";
import { ApiError } from "../../utils/apiError.util";
import { CreateBookingInput } from "./hotel.validation";
import { sendEmail, buildBookingConfirmationEmailHtml, buildCancellationGuestEmailHtml, buildCancellationAdminEmailHtml } from "../../utils/email.util";
import { createRazorpayOrder, verifyRazorpaySignature, createRazorpayRefund } from "../../utils/razorpay.util";
import { VerifyPaymentInput } from "./hotel.validation";

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
 *
 * Feature 4 (Phase 3.6): a single booking can contain multiple room
 * categories (e.g. 2 Deluxe + 1 Suite) — one bookingReference, one total
 * payment, one invoice/confirmation email, covering every room in the cart.
 */
export async function createHotelBooking(input: CreateBookingInput, userId?: string) {
  const hotel = await getHotelById(input.hotelId);

  const checkInDate = new Date(input.checkInDate);
  const checkOutDate = new Date(input.checkOutDate);
  const nights = calculateNights(checkInDate, checkOutDate);

  if (nights < 1) {
    throw new ApiError(400, "Booking must be for at least 1 night.");
  }

  // Resolve + validate every room line, checking availability for each
  // BEFORE creating anything — a partial booking (some rooms reserved, some
  // not) must never happen. Same race-condition caveat as before: this
  // minimizes but doesn't eliminate concurrent double-booking risk without a
  // DB transaction/distributed lock (flagged as a follow-up hardening item).
  const bookedRooms: {
    roomId: string;
    categoryName: string;
    roomName: string;
    numRooms: number;
    pricePerNight: number;
    subtotal: number;
    maxOccupancy: number;
  }[] = [];

  for (const line of input.rooms) {
    const room = await getRoomById(line.roomId);
    if (String(room.hotelId) !== String(hotel._id)) {
      throw new ApiError(400, `Room "${room.name}" does not belong to the specified hotel.`);
    }

    const availableCount = await getAvailableCount(line.roomId, checkInDate, checkOutDate);
    if (availableCount < line.numRooms) {
      throw new ApiError(
        409,
        `Only ${availableCount} room(s) of "${room.name}" are available for the selected dates.`
      );
    }

    bookedRooms.push({
      roomId: line.roomId,
      categoryName: room.categoryName,
      roomName: room.name,
      numRooms: line.numRooms,
      pricePerNight: room.basePrice,
      subtotal: room.basePrice * nights * line.numRooms,
      maxOccupancy: room.maxOccupancy,
    });
  }

  const totalCapacity = bookedRooms.reduce((sum, r) => sum + r.maxOccupancy * r.numRooms, 0);
  if (input.numGuests > totalCapacity) {
    throw new ApiError(400, `The selected rooms allow a maximum of ${totalCapacity} guests total.`);
  }

  const totalAmount = bookedRooms.reduce((sum, r) => sum + r.subtotal, 0);

  // Feature 1 (Phase 3.6): configurable advance payment percentage — booking
  // stays 'pending' until this amount is paid and verified via Razorpay.
  // advancePaid stays 0 here (nothing paid yet); advanceRequired records what
  // must be paid to confirm. Default 20% if unset.
  const advancePercent = Number(process.env.HOTEL_ADVANCE_PAYMENT_PERCENT) || 20;
  const advanceRequired = Math.round((totalAmount * advancePercent) / 100);
  const balanceDue = totalAmount; // nothing paid yet — full amount still due

  const booking = await HotelBooking.create({
    userId: userId || null,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    hotelId: input.hotelId,
    rooms: bookedRooms.map(({ maxOccupancy, ...rest }) => rest), // maxOccupancy was only needed for the capacity check above
    checkInDate,
    checkOutDate,
    numGuests: input.numGuests,
    status: "pending",
    totalAmount,
    advanceRequired,
    advancePaid: 0,
    balanceDue,
    specialRequest: input.specialRequest,
    bookingReference: generateBookingReference(),
  });

  // Feature 1: create the Razorpay order for the advance amount. If this
  // throws (gateway not configured / API error), the booking row already
  // exists as 'pending' — that's fine, it simply never gets paid/confirmed
  // and can be cleaned up like any other abandoned pending booking (see
  // suggestions in the phase summary re: an expiry job for stale pending
  // bookings, not built here as it wasn't asked for).
  const razorpayOrder = await createRazorpayOrder(advanceRequired, booking.bookingReference);
  booking.razorpayOrderId = razorpayOrder.id;
  booking.paymentStatus = "created";
  await booking.save();

  // No confirmation email here — booking is still 'pending'. The email now
  // sends from verifyPayment() once the advance payment actually succeeds.
  return { booking, razorpayOrder };
}

// Feature 1 (Phase 3.6): payment verification endpoint's core logic.
// Signature verification is the ONLY trustworthy proof of payment — never
// trust a client-side "success" callback alone. Duplicate-payment
// protection: only a 'pending' booking can be confirmed here, so replaying
// the same verify call twice (or an attacker resending captured params)
// fails the second time since the booking is no longer 'pending'.
export async function verifyPayment(input: VerifyPaymentInput) {
  const booking = await HotelBooking.findOne({ razorpayOrderId: input.razorpay_order_id });
  if (!booking) {
    throw new ApiError(404, "No booking found for this payment order.");
  }
  if (booking.status !== "pending") {
    throw new ApiError(409, "This booking's payment has already been processed.");
  }

  const isValid = verifyRazorpaySignature(
    input.razorpay_order_id,
    input.razorpay_payment_id,
    input.razorpay_signature
  );
  if (!isValid) {
    booking.paymentStatus = "failed";
    await booking.save();
    throw new ApiError(400, "Payment verification failed. Please contact support if the amount was debited.");
  }

  booking.status = "confirmed";
  booking.advancePaid = booking.advanceRequired;
  booking.balanceDue = booking.totalAmount - booking.advanceRequired;
  booking.razorpayPaymentId = input.razorpay_payment_id;
  booking.razorpaySignature = input.razorpay_signature;
  booking.paymentStatus = "paid";
  booking.paymentTime = new Date();
  await booking.save();

  const hotel = await getHotelById(String(booking.hotelId));
  await sendEmail({
    to: booking.guestEmail,
    subject: `Booking Confirmed — ${hotel.name} (${booking.bookingReference})`,
    html: buildBookingConfirmationEmailHtml({
      guestName: booking.guestName,
      hotelName: hotel.name,
      rooms: booking.rooms.map((r) => ({ name: r.roomName, numRooms: r.numRooms })),
      checkIn: booking.checkInDate.toDateString(),
      checkOut: booking.checkOutDate.toDateString(),
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
  const allowedStatuses = [
    "pending",
    "confirmed",
    "checked_in",
    "checked_out",
    "completed",
    "cancelled",
    "refund_pending",
    "refunded",
  ];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid booking status.");
  }

  const booking = await HotelBooking.findByIdAndUpdate(bookingId, { status }, { new: true });
  if (!booking) throw new ApiError(404, "Booking not found.");
  return booking;
}

// -- Feature 2 (Phase 3.6): booking cancellation --

// Free-cancellation window: full refund if cancelled at least this many hours
// before check-in. Configurable so the policy can change without a code
// deploy. Beyond this window, refundEligible is false (no refund) — a more
// granular tiered policy (e.g. 50% refund 24-48h out) can be layered in later
// without a schema change, since refundAmount is already stored independent
// of totalAmount/advancePaid.
function getCancellationPolicy() {
  const freeWindowHours = Number(process.env.CANCELLATION_FREE_WINDOW_HOURS) || 24;
  return { freeWindowHours };
}

export async function cancelBooking(
  bookingReference: string,
  requester: { guestEmail?: string; userId?: string },
  cancellationReason?: string
) {
  const booking = await HotelBooking.findOne({ bookingReference });
  if (!booking) throw new ApiError(404, "Booking not found.");

  if (booking.status === "cancelled" || booking.status === "refunded" || booking.status === "refund_pending") {
    throw new ApiError(409, "This booking has already been cancelled.");
  }
  if (booking.status === "checked_in" || booking.status === "checked_out" || booking.status === "completed") {
    throw new ApiError(409, "This booking can no longer be cancelled.");
  }

  // Identity check — only the booking's own guest (by email) or its owning
  // logged-in user may cancel it. A booking reference alone is not proof of
  // ownership (it can be seen on a screen or forwarded), so this is required
  // even though the reference itself is also required to look the booking up.
  const isOwner =
    (requester.userId && booking.userId && String(booking.userId) === String(requester.userId)) ||
    (requester.guestEmail && booking.guestEmail.toLowerCase() === requester.guestEmail.toLowerCase());
  if (!isOwner) {
    throw new ApiError(403, "You are not authorized to cancel this booking.");
  }

  if (new Date(booking.checkInDate) <= new Date()) {
    throw new ApiError(400, "Only future bookings can be cancelled.");
  }

  const { freeWindowHours } = getCancellationPolicy();
  const hoursUntilCheckIn = (booking.checkInDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const refundEligible = booking.advancePaid > 0 && hoursUntilCheckIn >= freeWindowHours;
  const refundAmount = refundEligible ? booking.advancePaid : 0;

  // Feature 1 closes the loop Feature 2 prepared for: actually call
  // Razorpay's refund API when eligible, instead of just marking the status
  // and stopping. If the refund call itself fails (gateway down, already
  // refunded on Razorpay's side, etc.), the cancellation still succeeds —
  // status falls back to 'refund_pending' for manual admin follow-up rather
  // than leaving the booking in limbo or throwing away the cancellation.
  let finalStatus: "cancelled" | "refund_pending" | "refunded" = "cancelled";
  if (refundEligible && booking.razorpayPaymentId) {
    try {
      await createRazorpayRefund(booking.razorpayPaymentId, refundAmount);
      finalStatus = "refunded";
    } catch (err) {
      console.error("⚠️  Razorpay refund failed during cancellation (will need manual follow-up):", err);
      finalStatus = "refund_pending";
    }
  } else if (refundEligible) {
    // Eligible by policy but no captured payment on file to refund against —
    // shouldn't normally happen (advancePaid > 0 implies a payment exists),
    // but fail safe to manual review rather than silently dropping it.
    finalStatus = "refund_pending";
  }

  booking.status = finalStatus;
  booking.cancelledAt = new Date();
  booking.cancellationReason = cancellationReason;
  booking.refundEligible = refundEligible;
  booking.refundAmount = refundAmount;
  await booking.save();

  const hotel = await getHotelById(String(booking.hotelId));

  await sendEmail({
    to: booking.guestEmail,
    subject: `Booking Cancelled — ${hotel.name} (${booking.bookingReference})`,
    html: buildCancellationGuestEmailHtml({
      guestName: booking.guestName,
      hotelName: hotel.name,
      bookingReference: booking.bookingReference,
      refundEligible,
      refundAmount,
    }),
  });

  // Admin notification — reuses the same sendEmail utility (dev-mode console
  // fallback applies here too if SMTP isn't configured). No new email
  // infrastructure created, per "never create duplicate systems".
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `[Cancellation] ${hotel.name} — ${booking.bookingReference}`,
      html: buildCancellationAdminEmailHtml({
        bookingReference: booking.bookingReference,
        hotelName: hotel.name,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        refundEligible,
        refundAmount,
      }),
    });
  } else {
    console.log(
      `📋 [Admin notification — ADMIN_NOTIFICATION_EMAIL not set] Booking ${booking.bookingReference} at ${hotel.name} was cancelled by ${booking.guestEmail}. Refund eligible: ${refundEligible}${refundEligible ? ` (₹${refundAmount})` : ""}.`
    );
  }

  return booking;
}
