import { z } from "zod";

/**
 * Zod schemas for the Restaurant module. Mirrors hotel.validation.ts's structure
 * and conventions so the two modules validate the same way.
 *
 * Note what is deliberately absent: there is no cart, order, quantity, delivery
 * or payment schema anywhere in this file. `RULES.md` §2 places online food
 * ordering in Phase 2, and a table reservation takes no payment.
 */

const slug = z
  .string()
  .min(2)
  .regex(/^[a-z0-9-]+$/, "slug must be lowercase, alphanumeric, hyphens only");

const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be 24-hour HH:MM, e.g. 19:30");

const isoDate = z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date");

// ---------- RESTAURANT (admin) ----------
export const createRestaurantSchema = z.object({
  branchId: z.string().min(1, "branchId is required"),
  name: z.string().min(2),
  slug,
  description: z.string().min(10),
  cuisineTypes: z.array(z.string().min(1)).optional(),
  serviceHours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        openTime: timeOfDay,
        closeTime: timeOfDay,
        isClosed: z.boolean().optional(),
        label: z.string().optional(),
      })
    )
    .optional(),
  reservationSlots: z.array(timeOfDay).optional(),
  reservationDurationMinutes: z.number().int().min(15).max(480).optional(),
  maxPartySize: z.number().int().positive().max(100).optional(),
  address: z.string().min(5),
  geoLat: z.number().optional(),
  geoLng: z.number().optional(),
  contactPhone: z.string().min(7),
  contactEmail: z.string().email(),
  whatsappNumber: z.string().min(7).optional(),
  features: z.array(z.object({ name: z.string(), icon: z.string().optional() })).optional(),
  images: z.array(z.string()).optional(),
  averageCostForTwo: z.number().min(0).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

// ---------- MENU CATEGORY (admin) ----------
export const createMenuCategorySchema = z.object({
  name: z.string().min(2),
  slug,
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateMenuCategorySchema = createMenuCategorySchema.partial();

// ---------- MENU ITEM (admin) ----------
export const createMenuItemSchema = z.object({
  categoryId: z.string().min(1, "categoryId is required"),
  name: z.string().min(2),
  description: z.string().min(3),
  price: z.number().min(0),
  foodType: z.enum(["veg", "non_veg", "egg"]),
  spiceLevel: z.enum(["mild", "medium", "hot"]).optional(),
  imageUrl: z.string().url().optional(),
  isChefSpecial: z.boolean().optional(),
  isTodaysSpecial: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  tags: z.array(z.string()).max(10).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

// ---------- MENU QUERY (public) ----------
// Backs menu search + veg/non-veg + price filters. Every field optional so the
// same endpoint serves the unfiltered menu.
export const menuQuerySchema = z.object({
  search: z.string().max(100).optional(),
  categoryId: z.string().optional(),
  foodType: z.enum(["veg", "non_veg", "egg"]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  chefSpecial: z.coerce.boolean().optional(),
  todaysSpecial: z.coerce.boolean().optional(),
  sortBy: z.enum(["price_asc", "price_desc", "name", "default"]).optional(),
});

// ---------- DINING AREA (admin) ----------
export const createDiningAreaSchema = z.object({
  name: z.string().min(2),
  slug,
  areaType: z.enum(["main", "private", "family", "outdoor"]),
  description: z.string().min(10),
  images: z.array(z.string()).optional(),
  totalTables: z.number().int().min(0),
  maxPartySize: z.number().int().positive(),
  minPartySize: z.number().int().positive().optional(),
  minimumSpend: z.number().min(0).optional(),
  features: z.array(z.string()).optional(),
});

export const updateDiningAreaSchema = createDiningAreaSchema.partial();

// ---------- TABLE AVAILABILITY (admin override) ----------
export const setTableAvailabilitySchema = z.object({
  date: isoDate,
  /** Omit to block the whole day. */
  timeSlot: timeOfDay.optional(),
  blockedTables: z.number().int().min(0),
  reason: z.string().max(200).optional(),
});

// ---------- AVAILABILITY CHECK (public) ----------
export const tableAvailabilityQuerySchema = z.object({
  date: isoDate,
  timeSlot: timeOfDay.optional(),
  partySize: z.coerce.number().int().positive().optional(),
});

// ---------- RESERVATION (public / guest) ----------
export const createReservationSchema = z.object({
  restaurantId: z.string().min(1),
  diningAreaId: z.string().min(1),
  reservationDate: isoDate,
  timeSlot: timeOfDay,
  partySize: z.number().int().positive(),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(7),
  specialRequest: z.string().max(500).optional(),
  occasion: z.string().max(60).optional(),
});

// ---------- RESERVATION CANCELLATION (public) ----------
// Same identity-check reasoning as cancelBookingSchema in the Hotel module: the
// reference alone is shareable, so a guest must also supply the email they
// booked with. Logged-in users are matched on userId in the service instead,
// which is why this stays optional at the schema level.
export const cancelReservationSchema = z.object({
  guestEmail: z.string().email().optional(),
  cancellationReason: z.string().max(500).optional(),
});

// ---------- RESERVATION STATUS (admin) ----------
export const updateReservationStatusSchema = z.object({
  status: z.enum(["confirmed", "seated", "completed", "cancelled", "no_show"]),
});

// ---------- REVIEW (public) ----------
// Identical shape to the Hotel module's createReviewSchema because both feed the
// same shared polymorphic Review model.
export const createRestaurantReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
  guestName: z.string().min(2).max(100).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type CreateMenuCategoryInput = z.infer<typeof createMenuCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type MenuQueryInput = z.infer<typeof menuQuerySchema>;
export type CreateDiningAreaInput = z.infer<typeof createDiningAreaSchema>;
export type SetTableAvailabilityInput = z.infer<typeof setTableAvailabilitySchema>;
export type TableAvailabilityQueryInput = z.infer<typeof tableAvailabilityQuerySchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type CreateRestaurantReviewInput = z.infer<typeof createRestaurantReviewSchema>;
