import { Router } from "express";
import * as hotelController from "./hotel.controller";
import { authenticate, optionalAuthenticate, requireRole } from "../../middlewares/auth.middleware";

// Admins allowed to manage hotel content — Super Admin (branchId=null) or the
// Branch Admin for that property. Staff can view but not mutate (per typical
// least-privilege pattern); adjust here centrally if that policy changes.
const HOTEL_MANAGER_ROLES = ["super_admin", "branch_admin"];

// ============================================================
// PUBLIC ROUTES  →  mounted at /api/v1/hotels
// ============================================================
export const publicHotelRouter = Router();

publicHotelRouter.get("/", hotelController.listHotels);
publicHotelRouter.get("/:slug", hotelController.getHotelDetails);
publicHotelRouter.get("/:slug/rooms", hotelController.listRooms);
publicHotelRouter.get("/:slug/rooms/:roomSlug", hotelController.getRoomDetails);
publicHotelRouter.get("/rooms/:roomId/availability", hotelController.checkRoomAvailability);

// Reviews — posting requires a logged-in user (not guests), per common practice.
publicHotelRouter.post(
  "/:hotelId/reviews",
  authenticate("user"),
  hotelController.createHotelReview
);

// ============================================================
// PUBLIC BOOKING ROUTES →  mounted at /api/v1/hotel-bookings
// ============================================================
export const publicBookingRouter = Router();

// Guest checkout supported — optionalAuthenticate attaches a user if a valid
// token is present, but never blocks the request, per RULES.md.
publicBookingRouter.post(
  "/",
  optionalAuthenticate("user"),
  hotelController.createBooking
);
publicBookingRouter.get("/reference/:reference", hotelController.getBookingByReference);
publicBookingRouter.get("/me", authenticate("user"), hotelController.getMyBookings);

// ============================================================
// ADMIN ROUTES  →  mounted at /api/v1/admin/hotels
// ============================================================
export const adminHotelRouter = Router();

adminHotelRouter.use(authenticate("admin"));

// -- Hotel CRUD --
adminHotelRouter.post("/", requireRole(...HOTEL_MANAGER_ROLES), hotelController.adminCreateHotel);
adminHotelRouter.put("/:hotelId", requireRole(...HOTEL_MANAGER_ROLES), hotelController.adminUpdateHotel);
adminHotelRouter.delete("/:hotelId", requireRole(...HOTEL_MANAGER_ROLES), hotelController.adminDeleteHotel);

// -- Room CRUD --
adminHotelRouter.post(
  "/:hotelId/rooms",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminCreateRoom
);
adminHotelRouter.put(
  "/rooms/:roomId",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminUpdateRoom
);
adminHotelRouter.delete(
  "/rooms/:roomId",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminDeleteRoom
);

// -- Availability management --
adminHotelRouter.put(
  "/rooms/:roomId/availability",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminSetAvailability
);
adminHotelRouter.get(
  "/rooms/:roomId/availability",
  requireRole(...HOTEL_MANAGER_ROLES, "staff"),
  hotelController.adminListAvailability
);

// -- Gallery management --
adminHotelRouter.post(
  "/:hotelId/gallery",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminAddGalleryItem
);
adminHotelRouter.delete(
  "/gallery/:itemId",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminDeleteGalleryItem
);

// -- Offers management --
adminHotelRouter.post(
  "/:hotelId/offers",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminCreateOffer
);
adminHotelRouter.put(
  "/offers/:offerId",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminUpdateOffer
);
adminHotelRouter.delete(
  "/offers/:offerId",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminDeleteOffer
);

// -- FAQ management --
adminHotelRouter.post(
  "/:hotelId/faqs",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminCreateFaq
);
adminHotelRouter.delete(
  "/faqs/:faqId",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminDeleteFaq
);

// -- Booking management --
adminHotelRouter.get(
  "/bookings",
  requireRole(...HOTEL_MANAGER_ROLES, "staff"),
  hotelController.adminListBookings
);
adminHotelRouter.put(
  "/bookings/:bookingId/status",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminUpdateBookingStatus
);
