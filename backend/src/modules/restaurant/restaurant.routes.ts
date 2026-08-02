import { Router } from "express";
import * as restaurantController from "./restaurant.controller";
import { authenticate, optionalAuthenticate, requireRole } from "../../middlewares/auth.middleware";
import { uploadImage } from "../../middlewares/upload.middleware";

/**
 * Restaurant routes.
 *
 * Structure and middleware are lifted directly from hotel.routes.ts — same three
 * routers (public content, public transactions, admin), same RBAC constant
 * pattern, same shared `authenticate` / `optionalAuthenticate` / `requireRole`
 * middleware and the same `uploadImage` multer instance. Nothing is duplicated.
 */

// Same roles as HOTEL_MANAGER_ROLES: Super Admin or the property's Branch Admin.
// Staff may read reservations and availability but not mutate content.
const RESTAURANT_MANAGER_ROLES = ["super_admin", "branch_admin"];

// ============================================================
// PUBLIC ROUTES  →  mounted at /api/v1/restaurants
// ============================================================
export const publicRestaurantRouter = Router();

publicRestaurantRouter.get("/", restaurantController.listRestaurants);

// NOTE ON ORDERING: the `/:slug` routes below would otherwise swallow any
// literal path placed after them (Express matches in declaration order), which
// is why the area-scoped availability route is declared first.
publicRestaurantRouter.get(
  "/dining-areas/:areaId/availability",
  restaurantController.checkTableAvailability
);

// Review photo upload — public, no auth (guests may review too), reusing the
// same multer middleware as the admin media routes.
publicRestaurantRouter.post(
  "/reviews/upload-image",
  uploadImage.single("image"),
  restaurantController.uploadReviewImage
);

publicRestaurantRouter.get("/:slug", restaurantController.getRestaurantDetails);
publicRestaurantRouter.get("/:slug/menu", restaurantController.listMenuItems);
publicRestaurantRouter.get("/:slug/menu/categories", restaurantController.listMenuCategories);
publicRestaurantRouter.get("/:slug/menu/chef-specials", restaurantController.getChefSpecials);
publicRestaurantRouter.get("/:slug/menu/todays-specials", restaurantController.getTodaysSpecials);
publicRestaurantRouter.get("/:slug/dining-areas", restaurantController.listDiningAreas);
publicRestaurantRouter.get("/:slug/availability", restaurantController.getDayAvailability);

// Guest reviews allowed without login — optionalAuthenticate attaches a user when
// a valid token is present but never blocks, matching the Hotel module.
publicRestaurantRouter.post(
  "/:restaurantId/reviews",
  optionalAuthenticate("user"),
  restaurantController.createRestaurantReview
);

// ============================================================
// PUBLIC RESERVATION ROUTES →  mounted at /api/v1/table-reservations
// ============================================================
export const publicReservationRouter = Router();

// Guest checkout supported per RULES.md — never force login to reserve.
publicReservationRouter.post(
  "/",
  optionalAuthenticate("user"),
  restaurantController.createReservation
);
publicReservationRouter.get("/me", authenticate("user"), restaurantController.getMyReservations);
publicReservationRouter.get(
  "/reference/:reference",
  restaurantController.getReservationByReference
);
publicReservationRouter.put(
  "/reference/:reference/cancel",
  optionalAuthenticate("user"),
  restaurantController.cancelReservation
);

// ============================================================
// ADMIN ROUTES  →  mounted at /api/v1/admin/restaurants
// ============================================================
export const adminRestaurantRouter = Router();

adminRestaurantRouter.use(authenticate("admin"));

// -- Restaurant CRUD --
adminRestaurantRouter.post(
  "/",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminCreateRestaurant
);
adminRestaurantRouter.put(
  "/:restaurantId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminUpdateRestaurant
);
adminRestaurantRouter.delete(
  "/:restaurantId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteRestaurant
);

// -- Media upload (Cloudinary) --
adminRestaurantRouter.post(
  "/upload-image",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  uploadImage.single("image"),
  restaurantController.adminUploadImage
);
adminRestaurantRouter.delete(
  "/upload-image",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteImage
);

// -- Menu categories --
adminRestaurantRouter.post(
  "/:restaurantId/menu/categories",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminCreateMenuCategory
);
adminRestaurantRouter.put(
  "/menu/categories/:categoryId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminUpdateMenuCategory
);
adminRestaurantRouter.delete(
  "/menu/categories/:categoryId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteMenuCategory
);

// -- Menu items --
adminRestaurantRouter.post(
  "/:restaurantId/menu/items",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminCreateMenuItem
);
adminRestaurantRouter.get(
  "/menu/items/:itemId",
  requireRole(...RESTAURANT_MANAGER_ROLES, "staff"),
  restaurantController.adminGetMenuItem
);
adminRestaurantRouter.put(
  "/menu/items/:itemId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminUpdateMenuItem
);
adminRestaurantRouter.delete(
  "/menu/items/:itemId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteMenuItem
);

// -- Dining areas --
adminRestaurantRouter.post(
  "/:restaurantId/dining-areas",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminCreateDiningArea
);
adminRestaurantRouter.get(
  "/dining-areas/:areaId",
  requireRole(...RESTAURANT_MANAGER_ROLES, "staff"),
  restaurantController.adminGetDiningArea
);
adminRestaurantRouter.put(
  "/dining-areas/:areaId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminUpdateDiningArea
);
adminRestaurantRouter.delete(
  "/dining-areas/:areaId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteDiningArea
);

// -- Table availability overrides --
adminRestaurantRouter.put(
  "/dining-areas/:areaId/availability",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminSetTableAvailability
);
adminRestaurantRouter.get(
  "/dining-areas/:areaId/availability",
  requireRole(...RESTAURANT_MANAGER_ROLES, "staff"),
  restaurantController.adminListTableAvailability
);

// -- Reservations (staff may view the book, not edit it) --
adminRestaurantRouter.get(
  "/reservations",
  requireRole(...RESTAURANT_MANAGER_ROLES, "staff"),
  restaurantController.adminListReservations
);
adminRestaurantRouter.put(
  "/reservations/:reservationId/status",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminUpdateReservationStatus
);

// -- Gallery --
adminRestaurantRouter.post(
  "/:restaurantId/gallery",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminAddGalleryItem
);
adminRestaurantRouter.delete(
  "/gallery/:itemId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteGalleryItem
);

// -- Offers --
adminRestaurantRouter.post(
  "/:restaurantId/offers",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminCreateOffer
);
adminRestaurantRouter.put(
  "/offers/:offerId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminUpdateOffer
);
adminRestaurantRouter.delete(
  "/offers/:offerId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteOffer
);

// -- FAQs --
adminRestaurantRouter.post(
  "/:restaurantId/faqs",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminCreateFaq
);
adminRestaurantRouter.delete(
  "/faqs/:faqId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteFaq
);

// -- Reviews --
adminRestaurantRouter.get(
  "/:restaurantId/reviews",
  requireRole(...RESTAURANT_MANAGER_ROLES, "staff"),
  restaurantController.adminListReviews
);
adminRestaurantRouter.put(
  "/reviews/:reviewId/approve",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminApproveReview
);
adminRestaurantRouter.put(
  "/reviews/:reviewId/reply",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminReplyToReview
);
adminRestaurantRouter.delete(
  "/reviews/:reviewId",
  requireRole(...RESTAURANT_MANAGER_ROLES),
  restaurantController.adminDeleteReview
);
