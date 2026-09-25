import crypto from "crypto";
import { Types } from "mongoose";
import { HotelBooking, IHotelBooking, HotelBookingStatus } from "./models/hotelBooking.model";
import {
  getRoomById,
  getAvailableCount,
  getHotelById,
  PENDING_HOLD_MINUTES,
  isPaymentHoldExpired,
  toMidnightUTC,
} from "./hotel.service";
import { ApiError } from "../../utils/apiError.util";
import { CreateBookingInput, VerifyPaymentInput } from "./hotel.validation";
import {
  sendEmail,
  buildBookingConfirmationEmailHtml,
  buildCancellationGuestEmailHtml,
  buildCancellationAdminEmailHtml,
  buildNewHotelBookingAdminEmailHtml,
} from "../../utils/email.util";
import { createRazorpayOrder, verifyRazorpaySignature, createRazorpayRefund } from "../../utils/razorpay.util";
import { getStoredSettingValue } from "../settings/settings.service";

// ---------- SETTINGS (precedence: admin-saved setting -> env -> default) ----------

function toFiniteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// Advance % charged online to confirm a booking, clamped to 1-100 (an env of 0
// becomes 1: a zero-rupee Razorpay order can't be created).
async function getAdvancePercent(): Promise<number> {
  const value =
    toFiniteNumber(await getStoredSettingValue("booking", "hotelAdvancePercent")) ??
    toFiniteNumber(process.env.HOTEL_ADVANCE_PAYMENT_PERCENT) ??
    20;
  return Math.min(100, Math.max(1, value));
}

async function getAdminNotificationEmail(): Promise<string | undefined> {
  const stored = await getStoredSettingValue("email", "adminNotificationEmail");
  return (typeof stored === "string" && stored.trim()) || process.env.ADMIN_NOTIFICATION_EMAIL || undefined;
}

async function isHotelBookingEnabled(): Promise<boolean> {
  return (await getStoredSettingValue("booking", "hotelEnabled")) !== false;
}

function paymentHoldDeadline(from: Date = new Date()): Date {
  return new Date(from.getTime() + PENDING_HOLD_MINUTES * 60 * 1000);
}

// ---------- RESPONSE PROJECTIONS ----------

// Fields that never leave the server on the public reference lookup.
const PUBLIC_HIDDEN_FIELDS = [
  "userId",
  "razorpayOrderId",
  "razorpayPaymentId",
  "razorpaySignature",
  "previousRazorpayOrderIds",
  "adminNotes",
  "razorpayRefundId",
  "refundError",
] as const;

/** `rahul@gmail.com` -> `ra***@gm***.com` */
export function maskEmail(email: string | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const [host, ...tld] = domain.split(".");
  return `${local.slice(0, 2)}***@${host.slice(0, 2)}***${tld.length ? `.${tld.join(".")}` : ""}`;
}

/** Keeps only the last 3 digits. */
export function maskPhone(phone: string | undefined): string {
  if (!phone) return "";
  const last = phone.replace(/\D/g, "").slice(-3);
  return last ? `*******${last}` : "***";
}

function toPlain(booking: unknown): Record<string, any> {
  const b = booking as { toObject?: () => Record<string, any> };
  return typeof b?.toObject === "function" ? b.toObject() : { ...(booking as Record<string, any>) };
}

/** Full booking for its owner / the guest who just acted on it, minus payment internals. */
export function withoutSecrets(booking: unknown): Record<string, any> {
  const obj = toPlain(booking);
  delete obj.razorpaySignature;
  delete obj.previousRazorpayOrderIds;
  return obj;
}

/**
 * What an unauthenticated holder of a booking reference may see. Same field
 * names as the full document (the confirmation page renders either), but
 * contact details are masked and payment / ownership internals are dropped.
 */
export function toPublicBooking(booking: unknown): Record<string, any> {
  const obj = toPlain(booking);
  for (const field of PUBLIC_HIDDEN_FIELDS) delete obj[field];
  obj.guestEmail = maskEmail(obj.guestEmail);
  obj.guestPhone = maskPhone(obj.guestPhone);
  return obj;
}

// A booking reference alone is never proof of ownership: it's printed on
// screens and forwarded in emails. The guest's email or the owning account is.
function isBookingOwner(
  booking: Pick<IHotelBooking, "userId" | "guestEmail">,
  requester: { guestEmail?: string; userId?: string }
): boolean {
  return Boolean(
    (requester.userId && booking.userId && String(booking.userId) === String(requester.userId)) ||
      (requester.guestEmail && booking.guestEmail.toLowerCase() === requester.guestEmail.toLowerCase())
  );
}

async function hotelNameFor(booking: Pick<IHotelBooking, "hotelId">): Promise<string> {
  try {
    return (await getHotelById(String(booking.hotelId))).name;
  } catch (err) {
    console.error("⚠️  Could not load hotel for booking email:", (err as Error)?.message);
    return "7 Vachan";
  }
}

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
 * (unlike Marriage Hall, which requires admin approval) — no approval step.
 * The booking is created as 'pending' with a Razorpay order for the advance;
 * it only becomes 'confirmed' in verifyPayment(), after signature verification.
 * Guest checkout is supported (userId is optional).
 *
 * Feature 4 (Phase 3.6): a single booking can contain multiple room
 * categories (e.g. 2 Deluxe + 1 Suite) — one bookingReference, one total
 * payment, one invoice/confirmation email, covering every room in the cart.
 */
export async function createHotelBooking(input: CreateBookingInput, userId?: string) {
  if (!(await isHotelBookingEnabled())) {
    throw new ApiError(403, "Online room booking is currently unavailable. Please contact us.");
  }

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

  // Two lines for the same room type would each be checked against the full
  // availability on their own and together could exceed it.
  const lineRoomIds = input.rooms.map((l) => l.roomId);
  if (new Set(lineRoomIds).size !== lineRoomIds.length) {
    throw new ApiError(400, "Each room type can appear only once in a booking.");
  }

  for (const line of input.rooms) {
    const room = await getRoomById(line.roomId);
    if (String(room.hotelId) !== String(hotel._id)) {
      throw new ApiError(400, `Room "${room.name}" does not belong to the specified hotel.`);
    }

    const availableCount = await getAvailableCount(line.roomId, checkInDate, checkOutDate, room);
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
  // must be paid to confirm. Admin setting, then env, then 20%.
  const advancePercent = await getAdvancePercent();
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
    // Rooms are held for the guest only this long while they pay.
    paymentExpiresAt: paymentHoldDeadline(),
  });

  // Feature 1: create the Razorpay order for the advance amount. If the
  // gateway fails, the booking is cancelled on the spot rather than left
  // 'pending' — it could never be paid, and it would otherwise hold the rooms
  // until its payment hold ran out.
  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder(advanceRequired, booking.bookingReference);
  } catch (err) {
    await HotelBooking.updateOne(
      { _id: booking._id, status: "pending" },
      {
        $set: {
          status: "cancelled",
          paymentStatus: "failed",
          cancelledAt: new Date(),
          cancellationReason: "Payment order could not be created (payment gateway error).",
        },
      }
    ).catch((e) => console.error("⚠️  Could not cancel booking after gateway failure:", e?.message));
    throw err;
  }
  booking.razorpayOrderId = razorpayOrder.id;
  booking.paymentStatus = "created";
  await booking.save();

  // No confirmation email here — booking is still 'pending'. The email now
  // sends from verifyPayment() once the advance payment actually succeeds.
  return { booking, razorpayOrder };
}

// Feature 1 (Phase 3.6): payment verification endpoint's core logic.
// Signature verification is the ONLY trustworthy proof of payment — never
// trust a client-side "success" callback alone.
//
// Race/replay safety: the confirm is ONE conditional write
// (`status: "pending"` + this order id), so of any number of concurrent or
// replayed verify calls exactly one wins and sends the emails. A replay of the
// already-applied payment gets the booking back (idempotent 200); anything
// else that loses gets 409.
export async function verifyPayment(input: VerifyPaymentInput) {
  const orderId = input.razorpay_order_id;
  // retry-payment swaps in a fresh order; the superseded ids are kept so a
  // guest who still pays an older Checkout isn't told the booking doesn't exist.
  const orderMatch = { $or: [{ razorpayOrderId: orderId }, { previousRazorpayOrderIds: orderId }] };

  const booking = await HotelBooking.findOne(orderMatch);
  if (!booking) {
    throw new ApiError(404, "No booking found for this payment order.");
  }

  const isValid = verifyRazorpaySignature(orderId, input.razorpay_payment_id, input.razorpay_signature);
  if (!isValid) {
    // Not persisted: a forged or garbled request must not be able to flip a
    // real guest's booking to paymentStatus "failed".
    console.warn(`⚠️  Invalid Razorpay signature for booking ${booking.bookingReference} (order ${orderId}).`);
    throw new ApiError(400, "Payment verification failed. Please contact support if the amount was debited.");
  }

  // Money has been taken by this point. A booking whose payment hold lapsed is
  // still confirmed — refusing would silently keep the guest's money — but if
  // its rooms were meanwhile taken by someone else, staff must hear about it.
  let overbooked = false;
  if (booking.status === "pending" && isPaymentHoldExpired(booking)) {
    try {
      for (const line of booking.rooms) {
        const available = await getAvailableCount(
          String(line.roomId),
          booking.checkInDate,
          booking.checkOutDate,
          undefined,
          { excludeBookingId: String(booking._id) }
        );
        if (available < line.numRooms) {
          overbooked = true;
          break;
        }
      }
    } catch (err) {
      console.error(
        `⚠️  Could not re-check availability for late payment on ${booking.bookingReference}:`,
        (err as Error)?.message
      );
    }
  }

  const confirmed = await HotelBooking.findOneAndUpdate(
    { _id: booking._id, status: "pending", ...orderMatch },
    {
      $set: {
        status: "confirmed",
        advancePaid: booking.advanceRequired,
        balanceDue: booking.totalAmount - booking.advanceRequired,
        razorpayOrderId: orderId,
        razorpayPaymentId: input.razorpay_payment_id,
        razorpaySignature: input.razorpay_signature,
        paymentStatus: "paid",
        paymentTime: new Date(),
      },
    },
    { new: true }
  );

  if (!confirmed) {
    const current = await HotelBooking.findById(booking._id);
    if (current && current.paymentStatus === "paid" && current.razorpayPaymentId === input.razorpay_payment_id) {
      return current; // same payment verified twice (double click, network retry) — idempotent
    }
    if (current && current.razorpayPaymentId !== input.razorpay_payment_id) {
      // A valid payment arrived for a booking that is no longer pending (e.g.
      // the guest cancelled it while Checkout was still open). The money is
      // real, so this needs a human.
      console.error(
        `🚨 Payment ${input.razorpay_payment_id} received for booking ${booking.bookingReference} in status "${current.status}" — needs manual review/refund.`
      );
    }
    throw new ApiError(409, "This booking's payment has already been processed.");
  }

  if (overbooked) {
    console.error(
      `🚨 OVERBOOK after late payment: booking ${confirmed.bookingReference} was paid after its payment hold expired and its rooms are no longer free for ${confirmed.checkInDate.toDateString()} – ${confirmed.checkOutDate.toDateString()}. Staff action required.`
    );
  }

  // Only the winning request reaches here. Fire-and-forget: a slow or failing
  // mail server (or a hotel lookup error) must never turn a confirmed, paid
  // booking into an error response.
  void sendConfirmationEmails(confirmed).catch(() => {});

  return confirmed;
}

async function sendConfirmationEmails(booking: IHotelBooking): Promise<void> {
  const hotelName = await hotelNameFor(booking);
  const rooms = booking.rooms.map((r) => ({ name: r.roomName, numRooms: r.numRooms }));

  await sendEmail({
    to: booking.guestEmail,
    subject: `Booking Confirmed — ${hotelName} (${booking.bookingReference})`,
    html: buildBookingConfirmationEmailHtml({
      guestName: booking.guestName,
      hotelName,
      rooms,
      checkIn: booking.checkInDate.toDateString(),
      checkOut: booking.checkOutDate.toDateString(),
      bookingReference: booking.bookingReference,
      totalAmount: booking.totalAmount,
      advancePaid: booking.advancePaid,
      balanceDue: booking.balanceDue,
    }),
  });

  const adminEmail = await getAdminNotificationEmail();
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `[New Booking] ${hotelName} — ${booking.bookingReference}`,
      html: buildNewHotelBookingAdminEmailHtml({
        bookingReference: booking.bookingReference,
        hotelName,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        rooms,
        checkIn: booking.checkInDate.toDateString(),
        checkOut: booking.checkOutDate.toDateString(),
        numGuests: booking.numGuests,
        totalAmount: booking.totalAmount,
        advancePaid: booking.advancePaid,
        balanceDue: booking.balanceDue,
        specialRequest: booking.specialRequest,
      }),
    });
  }
}

/**
 * Public lookup by reference. The owning logged-in user gets the full booking;
 * anyone else (a guest, a forwarded link, someone guessing references) gets the
 * masked public projection — see toPublicBooking().
 */
export async function getBookingByReference(bookingReference: string, viewerUserId?: string) {
  const booking = await HotelBooking.findOne({ bookingReference });
  if (!booking) throw new ApiError(404, "Booking not found.");
  const isOwner = Boolean(viewerUserId && booking.userId && String(booking.userId) === String(viewerUserId));
  return isOwner ? withoutSecrets(booking) : toPublicBooking(booking);
}

// Lets a guest whose Checkout was dismissed/failed pay again for the SAME
// booking instead of creating a new one. Ownership is proved exactly as for
// cancellation. Availability is re-checked (the hold may have lapsed) and a new
// hold window starts with the new order.
export async function retryBookingPayment(
  bookingReference: string,
  requester: { guestEmail?: string; userId?: string }
) {
  const booking = await HotelBooking.findOne({ bookingReference });
  if (!booking) throw new ApiError(404, "Booking not found.");

  if (!isBookingOwner(booking, requester)) {
    throw new ApiError(403, "You are not authorized to pay for this booking.");
  }
  if (booking.status !== "pending") {
    throw new ApiError(409, "This booking is no longer awaiting payment.");
  }
  if (!(await isHotelBookingEnabled())) {
    throw new ApiError(403, "Online room booking is currently unavailable. Please contact us.");
  }
  if (booking.checkInDate < toMidnightUTC(new Date())) {
    throw new ApiError(409, "The check-in date for this booking has already passed.");
  }

  for (const line of booking.rooms) {
    const available = await getAvailableCount(
      String(line.roomId),
      booking.checkInDate,
      booking.checkOutDate,
      undefined,
      { excludeBookingId: String(booking._id) }
    );
    if (available < line.numRooms) {
      throw new ApiError(
        409,
        `Sorry — "${line.roomName}" is no longer available for these dates. Please start a new booking.`
      );
    }
  }

  const razorpayOrder = await createRazorpayOrder(booking.advanceRequired, booking.bookingReference);

  const updated = await HotelBooking.findOneAndUpdate(
    { _id: booking._id, status: "pending" },
    {
      $set: {
        razorpayOrderId: razorpayOrder.id,
        paymentStatus: "created",
        paymentExpiresAt: paymentHoldDeadline(),
      },
      ...(booking.razorpayOrderId ? { $addToSet: { previousRazorpayOrderIds: booking.razorpayOrderId } } : {}),
    },
    { new: true }
  );
  if (!updated) throw new ApiError(409, "This booking is no longer awaiting payment.");

  return { booking: toPublicBooking(updated), razorpayOrder };
}

export async function getBookingsForUser(userId: string) {
  return HotelBooking.find({ userId }).sort({ createdAt: -1 });
}

export const ADMIN_BOOKINGS_DEFAULT_LIMIT = 200;
export const ADMIN_BOOKINGS_MAX_LIMIT = 500;

/**
 * Admin list. Always bounded (default 200 newest, max 500). `from`/`to` filter
 * on check-in date, `to` exclusive. When `page` is given the caller gets a
 * page envelope; otherwise the plain array the admin panel already reads.
 */
export async function listBookingsForAdmin(
  filters: {
    hotelId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const query: Record<string, unknown> = {};
  if (filters.hotelId) query.hotelId = filters.hotelId;
  if (filters.status) query.status = filters.status;
  if (filters.from || filters.to) {
    query.checkInDate = {
      ...(filters.from ? { $gte: new Date(filters.from) } : {}),
      ...(filters.to ? { $lt: new Date(filters.to) } : {}),
    };
  }

  const limit = Math.min(ADMIN_BOOKINGS_MAX_LIMIT, Math.max(1, filters.limit || ADMIN_BOOKINGS_DEFAULT_LIMIT));
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const items = await HotelBooking.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  if (!filters.page) return items;
  const total = await HotelBooking.countDocuments(query);
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// Which status an admin may move a booking to, from its current status.
// Refund statuses are set only by the refund flow, and nothing leaves a
// cancelled/refunded state.
const ALLOWED_TRANSITIONS: Record<HotelBookingStatus, HotelBookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: ["checked_out"],
  checked_out: ["completed"],
  completed: [],
  cancelled: [],
  refund_pending: [],
  refunded: [],
};

export async function updateBookingStatus(bookingId: string, status: HotelBookingStatus) {
  if (!Types.ObjectId.isValid(bookingId)) throw new ApiError(404, "Booking not found.");
  const booking = await HotelBooking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found.");

  const current = booking.status;
  if (current === status) return booking;

  if (status === "refunded" || status === "refund_pending") {
    throw new ApiError(409, "Refund statuses are set automatically by the refund process and can't be set by hand.");
  }
  if (current === "cancelled" || current === "refunded" || current === "refund_pending") {
    throw new ApiError(409, "A cancelled booking can't be reactivated. Create a new booking instead.");
  }
  if (!ALLOWED_TRANSITIONS[current].includes(status)) {
    throw new ApiError(409, `A booking can't move from "${current}" to "${status}".`);
  }
  if (current === "pending" && status === "confirmed" && booking.paymentStatus !== "paid") {
    throw new ApiError(409, "This booking can't be confirmed until its advance payment has been received.");
  }

  // Conditional on the status we validated against, so two admins (or an
  // admin and a guest cancelling) can't both apply a transition.
  const updated = await HotelBooking.findOneAndUpdate(
    { _id: booking._id, status: current },
    { $set: { status, ...(status === "cancelled" ? { cancelledAt: new Date() } : {}) } },
    { new: true }
  );
  if (!updated) {
    throw new ApiError(409, "This booking was just changed by someone else. Refresh and try again.");
  }
  return updated;
}

// -- Feature 2 (Phase 3.6): booking cancellation --

// Free-cancellation window: full refund if cancelled at least this many hours
// before check-in. Admin setting, then CANCELLATION_FREE_WINDOW_HOURS, then 24.
// Beyond this window, refundEligible is false (no refund) — a more granular
// tiered policy (e.g. 50% refund 24-48h out) can be layered in later without a
// schema change, since refundAmount is already stored independent of
// totalAmount/advancePaid.
async function getCancellationPolicy() {
  const freeWindowHours = Math.max(
    0,
    toFiniteNumber(await getStoredSettingValue("booking", "cancellationFreeWindowHours")) ??
      toFiniteNumber(process.env.CANCELLATION_FREE_WINDOW_HOURS) ??
      24
  );
  return { freeWindowHours };
}

/**
 * The ONE place a hotel refund reaches Razorpay. Guest cancellation calls it
 * today; admin-initiated or partial refunds should call it too rather than
 * talking to the gateway themselves. Never throws for a gateway failure: the
 * booking falls back to `refund_pending` with the error recorded, for manual
 * follow-up.
 *
 * Razorpay refund status → booking: "processed" → refunded, "pending" →
 * refund_pending (Razorpay settles it later), "failed"/error → refund_pending.
 */
export async function refundBooking(booking: IHotelBooking, amount: number, initiatedBy: string) {
  if (!booking.razorpayPaymentId) {
    // Eligible by policy but no captured payment on file — shouldn't normally
    // happen (advancePaid > 0 implies a payment), so fail safe to manual review.
    return (
      (await HotelBooking.findByIdAndUpdate(
        booking._id,
        { $set: { status: "refund_pending", refundError: "No captured payment on file to refund against." } },
        { new: true }
      )) || booking
    );
  }

  try {
    const refund = await createRazorpayRefund(booking.razorpayPaymentId, amount, {
      bookingReference: booking.bookingReference,
      initiatedBy,
    });
    const refundStatus: "pending" | "processed" | "failed" =
      refund.status === "processed" ? "processed" : refund.status === "failed" ? "failed" : "pending";
    return (
      (await HotelBooking.findByIdAndUpdate(
        booking._id,
        {
          $set: {
            status: refundStatus === "processed" ? "refunded" : "refund_pending",
            razorpayRefundId: refund.id,
            refundStatus,
            ...(refundStatus === "processed" ? { refundedAt: new Date() } : {}),
          },
        },
        { new: true }
      )) || booking
    );
  } catch (err) {
    console.error(
      `⚠️  Razorpay refund failed for ${booking.bookingReference} (will need manual follow-up):`,
      (err as Error)?.message
    );
    return (
      (await HotelBooking.findByIdAndUpdate(
        booking._id,
        {
          $set: {
            status: "refund_pending",
            refundStatus: "failed",
            refundError: String((err as Error)?.message || "Refund failed").slice(0, 500),
          },
        },
        { new: true }
      )) || booking
    );
  }
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
  if (!isBookingOwner(booking, requester)) {
    throw new ApiError(403, "You are not authorized to cancel this booking.");
  }

  if (new Date(booking.checkInDate) <= new Date()) {
    throw new ApiError(400, "Only future bookings can be cancelled.");
  }

  const { freeWindowHours } = await getCancellationPolicy();
  const hoursUntilCheckIn = (booking.checkInDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const refundEligible = booking.advancePaid > 0 && hoursUntilCheckIn >= freeWindowHours;
  const refundAmount = refundEligible ? booking.advancePaid : 0;

  // Cancel FIRST, conditionally on the status we just checked, so of two
  // concurrent cancel requests exactly one gets past here — and only that one
  // reaches the refund gateway. The refund then moves it on to
  // refunded/refund_pending.
  const cancelled = await HotelBooking.findOneAndUpdate(
    { _id: booking._id, status: booking.status },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason,
        refundEligible,
        refundAmount,
      },
    },
    { new: true }
  );
  if (!cancelled) {
    throw new ApiError(409, "This booking was just updated. Please refresh and try again.");
  }

  const result = refundEligible ? await refundBooking(cancelled, refundAmount, "guest") : cancelled;

  void sendCancellationEmails(result, refundEligible, refundAmount).catch(() => {});

  return result;
}

async function sendCancellationEmails(booking: IHotelBooking, refundEligible: boolean, refundAmount: number) {
  const hotelName = await hotelNameFor(booking);

  await sendEmail({
    to: booking.guestEmail,
    subject: `Booking Cancelled — ${hotelName} (${booking.bookingReference})`,
    html: buildCancellationGuestEmailHtml({
      guestName: booking.guestName,
      hotelName,
      bookingReference: booking.bookingReference,
      refundEligible,
      refundAmount,
    }),
  });

  // Admin notification — reuses the same sendEmail utility (dev-mode console
  // fallback applies here too if SMTP isn't configured). No new email
  // infrastructure created, per "never create duplicate systems".
  const adminEmail = await getAdminNotificationEmail();
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `[Cancellation] ${hotelName} — ${booking.bookingReference}`,
      html: buildCancellationAdminEmailHtml({
        bookingReference: booking.bookingReference,
        hotelName,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        refundEligible,
        refundAmount,
      }),
    });
  } else {
    console.log(
      `📋 [Admin notification — ADMIN_NOTIFICATION_EMAIL not set] Booking ${booking.bookingReference} at ${hotelName} was cancelled. Refund eligible: ${refundEligible}${refundEligible ? ` (₹${refundAmount})` : ""}.`
    );
  }
}
