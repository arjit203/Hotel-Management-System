import rateLimit from "express-rate-limit";

/**
 * Rate limiters for public-facing endpoints (AI_INSTRUCTIONS.md §8: "Rate-limit
 * public-facing forms (booking, contact, enquiry) to prevent abuse/spam").
 *
 * Same shape as the auth limiter in auth.routes.ts, shared here so the three
 * verticals don't each define their own.
 *
 * Public GET lookups such as `/hotel-bookings/reference/:ref` use the separate,
 * high-ceiling `publicLookupLimiter` below: the confirmation pages fetch them
 * server-side from Next.js, so in production many visitors' lookups arrive from
 * the same IP, and a form-sized limit would lock them all out at once. Its job is
 * only to make reference enumeration slow.
 */
const message = { success: false, message: "Too many requests. Please try again in a few minutes." };

/** Booking / reservation / enquiry / review submissions and payment verification. */
export const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

/** Unauthenticated review-photo uploads — each one costs Cloudinary storage. */
export const publicUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

/**
 * Payment verification only. Separate from `publicFormLimiter` so a guest who
 * has already paid is never 429'd out of confirming because the same IP (hotel
 * Wi-Fi, office NAT) also submitted forms. Generous: the route is gated by the
 * Razorpay HMAC, so a flood achieves nothing but load.
 */
export const paymentVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

/**
 * Public lookups by booking/reservation/enquiry reference. Mostly called
 * server-side by the Next.js confirmation pages (one shared IP), so the ceiling
 * is high. Its job is to make reference enumeration slow, not to limit guests.
 */
export const publicLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
