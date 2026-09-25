import rateLimit from "express-rate-limit";

/**
 * Rate limiters for public-facing endpoints (AI_INSTRUCTIONS.md §8: "Rate-limit
 * public-facing forms (booking, contact, enquiry) to prevent abuse/spam").
 *
 * Same shape as the auth limiter in auth.routes.ts, shared here so the three
 * verticals don't each define their own.
 *
 * Only browser-originated requests are limited. GET lookups such as
 * `/hotel-bookings/reference/:ref` are deliberately NOT limited here: the
 * confirmation pages fetch them server-side from Next.js, so in production every
 * visitor's lookup arrives from the same IP and an IP limit would lock all of
 * them out at once.
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
