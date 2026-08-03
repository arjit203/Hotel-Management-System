import { Router } from "express";
import * as hotelController from "./hotel.controller";
import { authenticate, optionalAuthenticate, requireRole } from "../../middlewares/auth.middleware";
import { auditLogger } from "../../middlewares/audit.middleware";
import { uploadImage } from "../../middlewares/upload.middleware";

// Admins allowed to manage hotel content — Super Admin (branchId=null) or the
// Branch Admin for that property. Staff can view but not mutate (per typical
// least-privilege pattern); adjust here centrally if that policy changes.
const HOTEL_MANAGER_ROLES = ["super_admin", "hotel_manager"];

// ============================================================
// PUBLIC ROUTES  →  mounted at /api/v1/hotels
// ============================================================
export const publicHotelRouter = Router();

publicHotelRouter.get("/", hotelController.listHotels);
publicHotelRouter.get("/:slug", hotelController.getHotelDetails);
publicHotelRouter.get("/:slug/rooms", hotelController.listRooms);
publicHotelRouter.get("/:slug/rooms/search", hotelController.searchRooms);
publicHotelRouter.get("/:slug/rooms/:roomSlug", hotelController.getRoomDetails);
publicHotelRouter.get("/rooms/:roomId/availability", hotelController.checkRoomAvailability);

// Reviews — guest reviews allowed (no login required), per explicit owner
// decision. optionalAuthenticate attaches a user if a valid token is present
// (their account name is used), but never blocks the request — matching the
// same guest-checkout pattern already used for hotel bookings.
// Feature 5 (Phase 3.6): review image upload — public, no auth (guests can
// review too), reuses the same uploadImage middleware as admin media routes.
publicHotelRouter.post(
  "/reviews/upload-image",
  uploadImage.single("image"),
  hotelController.uploadReviewImage
);

publicHotelRouter.post(
  "/:hotelId/reviews",
  optionalAuthenticate("user"),
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
publicBookingRouter.post("/verify-payment", hotelController.verifyPayment);
publicBookingRouter.get("/reference/:reference", hotelController.getBookingByReference);
publicBookingRouter.put(
  "/reference/:reference/cancel",
  optionalAuthenticate("user"),
  hotelController.cancelBooking
);
publicBookingRouter.get("/me", authenticate("user"), hotelController.getMyBookings);

// ============================================================
// ADMIN ROUTES  →  mounted at /api/v1/admin/hotels
// ============================================================
export const adminHotelRouter = Router();

adminHotelRouter.use(authenticate("admin"));
// Records every mutation on this router — create, update, delete, status and
// role changes, uploads — without a single controller or service knowing it
// exists. Hooks res.on("finish"), so it runs after the response is sent and can
// neither slow a request down nor fail one. Must come after authenticate(),
// because it reads req.actor. See middlewares/audit.middleware.ts.
adminHotelRouter.use(auditLogger());

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
adminHotelRouter.get(
  "/rooms/:roomId",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminGetRoom
);
adminHotelRouter.put("/rooms/:roomId", requireRole(...HOTEL_MANAGER_ROLES), hotelController.adminUpdateRoom);
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
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminListAvailability
);

// -- Media upload (Cloudinary) — generic, used by Hotel/Room/Gallery/Offer forms --
adminHotelRouter.post(
  "/upload-image",
  requireRole(...HOTEL_MANAGER_ROLES),
  uploadImage.single("image"),
  hotelController.adminUploadImage
);
adminHotelRouter.delete(
  "/upload-image",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminDeleteImage
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
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminListBookings
);
adminHotelRouter.put(
  "/bookings/:bookingId/status",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminUpdateBookingStatus
);

// -- Review management --
adminHotelRouter.get(
  "/:hotelId/reviews",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminListReviews
);
adminHotelRouter.put(
  "/reviews/:reviewId/approve",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminApproveReview
);
adminHotelRouter.put(
  "/reviews/:reviewId/reply",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminReplyToReview
);
adminHotelRouter.delete(
  "/reviews/:reviewId",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminDeleteReview
);
adminHotelRouter.delete(
  "/reviews/:reviewId/images",
  requireRole(...HOTEL_MANAGER_ROLES),
  hotelController.adminRemoveReviewImage
);
