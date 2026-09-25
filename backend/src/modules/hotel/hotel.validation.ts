import { z } from "zod";

// ---------- STAY LIMITS ----------
// Every availability computation walks the stay night by night, so an
// unbounded range (checkIn=1970, checkOut=2999) is a cheap DoS. These caps are
// enforced here (400 via Zod) and again inside getAvailableCount for any
// caller that bypasses the schemas.
export const MAX_STAY_NIGHTS = 60;
export const MAX_BOOKING_HORIZON_DAYS = 730; // check-in no more than ~2 years out
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns an error message when a stay breaks the caps, else null. */
export function stayRangeError(checkIn: Date, checkOut: Date): string | null {
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);
  if (nights > MAX_STAY_NIGHTS) return `A stay can be at most ${MAX_STAY_NIGHTS} nights.`;
  if (checkIn.getTime() > Date.now() + MAX_BOOKING_HORIZON_DAYS * MS_PER_DAY) {
    return "Check-in can be at most 2 years ahead.";
  }
  return null;
}

// ---------- HOTEL (admin) ----------
export const createHotelSchema = z.object({
  branchId: z.string().min(1, "branchId is required"),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "slug must be lowercase, alphanumeric, hyphens only"),
  description: z.string().min(10),
  starRating: z.number().min(1).max(5).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  address: z.string().min(5),
  geoLat: z.number().optional(),
  geoLng: z.number().optional(),
  contactPhone: z.string().min(7),
  contactEmail: z.string().email(),
  amenities: z.array(z.object({ name: z.string(), icon: z.string().optional() })).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const updateHotelSchema = createHotelSchema.partial();

// ---------- ROOM (admin) ----------
export const createRoomSchema = z.object({
  categoryName: z.enum(["Deluxe", "Executive", "Luxury", "Suite"]),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  images: z.array(z.string()).optional(),
  basePrice: z.number().positive(),
  maxOccupancy: z.number().int().positive(),
  totalRooms: z.number().int().min(0),
  amenities: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

// ---------- AVAILABILITY (admin) ----------
export const setAvailabilitySchema = z.object({
  date: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  blockedCount: z.number().int().min(0),
  reason: z.string().optional(),
});

// ---------- AVAILABILITY CHECK (public) ----------
export const availabilityQuerySchema = z
  .object({
    checkIn: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid checkIn date"),
    checkOut: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid checkOut date"),
  })
  .superRefine((data, ctx) => {
    const message = stayRangeError(new Date(data.checkIn), new Date(data.checkOut));
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["checkOut"] });
  });

// ---------- BOOKING (public/guest) ----------
export const createBookingSchema = z
  .object({
    hotelId: z.string().min(1),
    rooms: z
      .array(
        z.object({
          roomId: z.string().min(1),
          numRooms: z.number().int().positive(),
        })
      )
      .min(1, "At least one room must be selected.")
      .max(10, "At most 10 room types can be booked at once."),
    checkInDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid checkInDate"),
    checkOutDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid checkOutDate"),
    numGuests: z.number().int().positive(),
    guestName: z.string().min(2),
    guestEmail: z.string().email(),
    guestPhone: z.string().min(7),
    specialRequest: z.string().optional(),
  })
  .refine((data) => new Date(data.checkOutDate) > new Date(data.checkInDate), {
    message: "checkOutDate must be after checkInDate",
    path: ["checkOutDate"],
  })
  .superRefine((data, ctx) => {
    const message = stayRangeError(new Date(data.checkInDate), new Date(data.checkOutDate));
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["checkOutDate"] });
  });

// ---------- PAYMENT VERIFICATION (Feature 1, Phase 3.6) ----------
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// ---------- BOOKING CANCELLATION (Feature 2, Phase 3.6) ----------
// guestEmail is required as a lightweight identity check — bookingReference
// alone is guessable/shareable, so this prevents a stranger who only has the
// reference (e.g. seen on a screen, forwarded email) from cancelling someone
// else's booking. Logged-in users are additionally allowed to cancel their
// own booking without re-entering the email (checked in the controller via
// userId match), so this field is optional at the schema level.
export const cancelBookingSchema = z.object({
  guestEmail: z.string().email().optional(),
  cancellationReason: z.string().max(500).optional(),
});

// ---------- RETRY PAYMENT (public) ----------
// Same ownership rule as cancellation: guestEmail, or a logged-in owner.
export const retryPaymentSchema = z.object({
  guestEmail: z.string().email().optional(),
});

// ---------- BOOKING STATUS (admin) ----------
// Every value of the model enum is accepted by the schema; which moves are
// actually legal from the booking's current status is decided in
// booking.service.ts (ALLOWED_TRANSITIONS), so the message can say why.
export const updateBookingStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "checked_in",
    "checked_out",
    "completed",
    "cancelled",
    "refund_pending",
    "refunded",
  ]),
});

// ---------- BOOKING LIST (admin) ----------
// All optional. Without `page` the endpoint keeps returning a bare array.
export const adminListBookingsQuerySchema = z.object({
  hotelId: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  from: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid from date").optional(),
  to: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid to date").optional(),
});

// ---------- REVIEW (public, requires login — enforced in controller) ----------
export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
  // Optional here because a logged-in user's name is looked up server-side
  // instead; required in practice for guest submissions (enforced in the
  // controller, not the schema, since "required only if no login" isn't
  // expressible as a static schema rule).
  guestName: z.string().min(2).max(100).optional(),
  // Feature 5 (Phase 3.6): review images — capped at 5 per review, uploaded
  // beforehand via POST /hotels/reviews/upload-image (same shared Cloudinary
  // utility as the admin media routes), then their URLs sent here.
  images: z.array(z.string().url()).max(5).optional(),
});

// ---------- REVIEW REPLY (admin) ----------
export const replyReviewSchema = z.object({
  reply: z.string().min(1).max(1000),
});

// ---------- REVIEW IMAGE DELETE (admin, Feature 5) ----------
export const removeReviewImageSchema = z.object({
  imageUrl: z.string().url(),
});

export type CreateHotelInput = z.infer<typeof createHotelSchema>;
export type UpdateHotelInput = z.infer<typeof updateHotelSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
