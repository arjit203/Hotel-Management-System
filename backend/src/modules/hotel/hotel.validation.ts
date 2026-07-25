import { z } from "zod";

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
export const availabilityQuerySchema = z.object({
  checkIn: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid checkIn date"),
  checkOut: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid checkOut date"),
});

// ---------- BOOKING (public/guest) ----------
export const createBookingSchema = z
  .object({
    hotelId: z.string().min(1),
    roomId: z.string().min(1),
    checkInDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid checkInDate"),
    checkOutDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid checkOutDate"),
    numGuests: z.number().int().positive(),
    numRooms: z.number().int().positive().default(1),
    guestName: z.string().min(2),
    guestEmail: z.string().email(),
    guestPhone: z.string().min(7),
    specialRequest: z.string().optional(),
  })
  .refine((data) => new Date(data.checkOutDate) > new Date(data.checkInDate), {
    message: "checkOutDate must be after checkInDate",
    path: ["checkOutDate"],
  });

// ---------- REVIEW (public, requires login — enforced in controller) ----------
export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
});

export type CreateHotelInput = z.infer<typeof createHotelSchema>;
export type UpdateHotelInput = z.infer<typeof updateHotelSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
