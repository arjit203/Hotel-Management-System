import { z } from "zod";
import { HALL_SHOWCASE_TYPES } from "./models/hallShowcase.model";
import { HALL_DATE_STATUSES } from "./models/hallAvailability.model";

/**
 * Zod schemas for the Marriage Hall module. Same conventions as
 * hotel.validation.ts and restaurant.validation.ts — parse in the controller,
 * throw a uniform 400 with per-field errors, never validate in the service.
 *
 * Note what is absent, and must stay absent without a `RULES.md` change:
 * no amount, price, advance, payment or invoice field on the enquiry schemas.
 * A hall enquiry charges nothing (`RULES.md` §14). Package pricing is a display
 * string, not a number — see hallPackage.model.ts.
 */

const slug = z
  .string()
  .min(2)
  .regex(/^[a-z0-9-]+$/, "slug must be lowercase, alphanumeric, hyphens only");

const isoDate = z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date");

/** #rgb or #rrggbb — the palette strip renders these as raw swatches. */
const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex colour, e.g. #b08d57");

// ---------- HALL (admin) ----------
export const createHallSchema = z.object({
  branchId: z.string().min(1, "branchId is required"),
  name: z.string().min(2),
  slug,
  tagline: z.string().max(160).optional(),
  description: z.string().min(10),

  seatedCapacity: z.number().int().min(0),
  floatingCapacity: z.number().int().min(0),
  spaces: z
    .array(
      z.object({
        label: z.string().min(1),
        seated: z.number().int().min(0),
        floating: z.number().int().min(0),
        description: z.string().optional(),
      })
    )
    .optional(),

  eventTypes: z.array(z.string().min(1)).optional(),
  features: z.array(z.object({ name: z.string().min(1), icon: z.string().optional() })).optional(),
  parkingCapacity: z.number().int().min(0).optional(),
  guestRooms: z.number().int().min(0).optional(),

  address: z.string().min(5),
  geoLat: z.number().optional(),
  geoLng: z.number().optional(),
  contactPhone: z.string().min(7),
  contactEmail: z.string().email(),
  whatsappNumber: z.string().min(7).optional(),

  heroImages: z.array(z.string()).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),

  minimumNoticeDays: z.number().int().min(0).max(365).optional(),

  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const updateHallSchema = createHallSchema.partial();

// ---------- PACKAGE (admin) ----------
export const createHallPackageSchema = z.object({
  name: z.string().min(2),
  slug,
  tagline: z.string().max(160).optional(),
  description: z.string().min(10),
  inclusions: z.array(z.string().min(1)).max(40).optional(),
  highlights: z.array(z.string().min(1)).max(12).optional(),
  // Free text, never a number — the venue has not set pricing.
  priceLabel: z.string().max(80).optional(),
  suitableForMinGuests: z.number().int().min(0).optional(),
  suitableForMaxGuests: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  images: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateHallPackageSchema = createHallPackageSchema.partial();

// ---------- SHOWCASE (admin) — decoration / catering / dining / floral ----------
export const createHallShowcaseSchema = z.object({
  showcaseType: z.enum(HALL_SHOWCASE_TYPES as [string, ...string[]]),
  category: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(10),
  images: z.array(z.string()).optional(),
  highlights: z.array(z.string().min(1)).max(20).optional(),
  colorPalette: z.array(hexColor).max(8).optional(),
  sampleItems: z.array(z.string().min(1)).max(40).optional(),
  beforeImageUrl: z.string().url().optional().or(z.literal("")),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateHallShowcaseSchema = createHallShowcaseSchema.partial();

/** Public list filter — `GET /halls/:slug/showcase?type=catering`. */
export const showcaseQuerySchema = z.object({
  type: z.enum(HALL_SHOWCASE_TYPES as [string, ...string[]]).optional(),
  category: z.string().optional(),
});

// ---------- AVAILABILITY (admin override) ----------
export const setHallAvailabilitySchema = z.object({
  date: isoDate,
  status: z.enum(HALL_DATE_STATUSES as [string, ...string[]]),
  reason: z.string().max(200).optional(),
});

/**
 * Public calendar query. Month is 1-12 to match what a human types; the service
 * converts to JS's 0-indexed month.
 */
export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  /** Fetch several months in one call so the calendar can page without a spinner. */
  months: z.coerce.number().int().min(1).max(12).optional(),
});

// ---------- ENQUIRY (public / guest) ----------
export const createHallEnquirySchema = z.object({
  hallId: z.string().min(1),
  eventDate: isoDate,
  alternateDate: isoDate.optional(),
  eventType: z.string().min(2).max(60),
  guestCount: z.number().int().positive().max(20000),

  packageId: z.string().optional(),
  decorationThemeId: z.string().optional(),
  cateringPreference: z.string().max(120).optional(),
  budgetRange: z.string().max(60).optional(),

  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(7).max(20),
  specialRequirements: z.string().max(1000).optional(),
});

/**
 * Guest-initiated withdrawal. Same identity rule as hotel booking and table
 * reservation cancellation: the reference alone is shareable, so a guest must
 * also supply the email they enquired with. Logged-in users are matched on
 * userId in the service instead, which is why this stays optional here.
 */
export const cancelHallEnquirySchema = z.object({
  guestEmail: z.string().email().optional(),
  cancellationReason: z.string().max(500).optional(),
});

// ---------- ENQUIRY STATUS (admin) ----------
export const updateHallEnquiryStatusSchema = z.object({
  status: z.enum(["pending", "reviewing", "approved", "confirmed", "declined", "cancelled"]),
  adminNotes: z.string().max(1000).optional(),
});

// ---------- REVIEW (public) ----------
// Identical shape to the Hotel and Restaurant review schemas — all three feed
// the same shared polymorphic Review model.
export const createHallReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
  guestName: z.string().min(2).max(100).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export type CreateHallInput = z.infer<typeof createHallSchema>;
export type UpdateHallInput = z.infer<typeof updateHallSchema>;
export type CreateHallPackageInput = z.infer<typeof createHallPackageSchema>;
export type CreateHallShowcaseInput = z.infer<typeof createHallShowcaseSchema>;
export type ShowcaseQueryInput = z.infer<typeof showcaseQuerySchema>;
export type SetHallAvailabilityInput = z.infer<typeof setHallAvailabilitySchema>;
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
export type CreateHallEnquiryInput = z.infer<typeof createHallEnquirySchema>;
export type CancelHallEnquiryInput = z.infer<typeof cancelHallEnquirySchema>;
export type CreateHallReviewInput = z.infer<typeof createHallReviewSchema>;
