import { Router } from "express";
import * as hallController from "./hall.controller";
import { authenticate, optionalAuthenticate, requireRole } from "../../middlewares/auth.middleware";
import { auditLogger } from "../../middlewares/audit.middleware";
import { uploadImage } from "../../middlewares/upload.middleware";

/**
 * Marriage Hall routes.
 *
 * Structure and middleware are lifted directly from hotel.routes.ts and
 * restaurant.routes.ts — same three routers (public content, public
 * transactions, admin), same RBAC constant pattern, same shared
 * `authenticate` / `optionalAuthenticate` / `requireRole` middleware and the
 * same `uploadImage` multer instance. Nothing is duplicated.
 */

/**
 * Who may manage hall content.
 *
 * Each module names its own managers, so a `hall_manager` token is rejected by
 * Hotel and Restaurant automatically — the isolation falls out of the existing
 * `requireRole` pattern rather than needing new middleware. Super Admin remains
 * in every list.
 */
const HALL_MANAGER_ROLES = ["super_admin", "hall_manager"];

// ============================================================
// PUBLIC ROUTES  →  mounted at /api/v1/halls
// ============================================================
export const publicHallRouter = Router();

publicHallRouter.get("/", hallController.listHalls);

// NOTE ON ORDERING: the `/:slug` routes below would otherwise swallow any
// literal path declared after them (Express matches in declaration order),
// which is why the review upload route is declared first.
publicHallRouter.post(
  "/reviews/upload-image",
  uploadImage.single("image"),
  hallController.uploadReviewImage
);

publicHallRouter.get("/:slug", hallController.getHallDetails);
publicHallRouter.get("/:slug/packages", hallController.listPackages);
publicHallRouter.get("/:slug/showcase", hallController.listShowcases);
publicHallRouter.get("/:slug/showcase/:type", hallController.getShowcaseSection);
publicHallRouter.get("/:slug/calendar", hallController.getCalendar);

// Guest reviews allowed without login — optionalAuthenticate attaches a user
// when a valid token is present but never blocks, matching Hotel and Restaurant.
publicHallRouter.post(
  "/:hallId/reviews",
  optionalAuthenticate("user"),
  hallController.createHallReview
);

// ============================================================
// PUBLIC ENQUIRY ROUTES →  mounted at /api/v1/hall-enquiries
// ============================================================
export const publicEnquiryRouter = Router();

// Guest checkout supported per RULES.md — never force login to enquire.
// This creates an ENQUIRY, not a booking: nothing is reserved, nothing charged.
publicEnquiryRouter.post("/", optionalAuthenticate("user"), hallController.createEnquiry);
publicEnquiryRouter.get("/me", authenticate("user"), hallController.getMyEnquiries);
publicEnquiryRouter.get("/reference/:reference", hallController.getEnquiryByReference);
publicEnquiryRouter.put(
  "/reference/:reference/cancel",
  optionalAuthenticate("user"),
  hallController.cancelEnquiry
);

// ============================================================
// ADMIN ROUTES  →  mounted at /api/v1/admin/halls
// ============================================================
export const adminHallRouter = Router();

adminHallRouter.use(authenticate("admin"));
// Records every mutation on this router — create, update, delete, status and
// role changes, uploads — without a single controller or service knowing it
// exists. Hooks res.on("finish"), so it runs after the response is sent and can
// neither slow a request down nor fail one. Must come after authenticate(),
// because it reads req.actor. See middlewares/audit.middleware.ts.
adminHallRouter.use(auditLogger());

// -- Hall CRUD --
adminHallRouter.post("/", requireRole(...HALL_MANAGER_ROLES), hallController.adminCreateHall);
adminHallRouter.get(
  "/:hallId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminGetHall
);
adminHallRouter.put(
  "/:hallId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminUpdateHall
);
adminHallRouter.delete(
  "/:hallId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminDeleteHall
);

// -- Media upload (Cloudinary) --
adminHallRouter.post(
  "/upload-image",
  requireRole(...HALL_MANAGER_ROLES),
  uploadImage.single("image"),
  hallController.adminUploadImage
);
adminHallRouter.delete(
  "/upload-image",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminDeleteImage
);

// -- Enquiries (staff may read the book, not action it) --
// Declared before /:hallId/... groups so "enquiries" is never read as a hallId.
adminHallRouter.get(
  "/enquiries/list",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminListEnquiries
);
adminHallRouter.put(
  "/enquiries/:enquiryId/status",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminUpdateEnquiryStatus
);

// -- Packages --
adminHallRouter.post(
  "/:hallId/packages",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminCreatePackage
);
adminHallRouter.get(
  "/packages/:packageId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminGetPackage
);
adminHallRouter.put(
  "/packages/:packageId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminUpdatePackage
);
adminHallRouter.delete(
  "/packages/:packageId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminDeletePackage
);

// -- Showcases: decoration themes, catering, dining, floral --
adminHallRouter.get(
  "/:hallId/showcase",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminListShowcases
);
adminHallRouter.post(
  "/:hallId/showcase",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminCreateShowcase
);
adminHallRouter.get(
  "/showcase/:showcaseId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminGetShowcase
);
adminHallRouter.put(
  "/showcase/:showcaseId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminUpdateShowcase
);
adminHallRouter.delete(
  "/showcase/:showcaseId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminDeleteShowcase
);

// -- Availability calendar --
adminHallRouter.get(
  "/:hallId/calendar",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminGetCalendar
);
adminHallRouter.put(
  "/:hallId/availability",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminSetAvailability
);
adminHallRouter.put(
  "/:hallId/availability/range",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminSetAvailabilityRange
);
adminHallRouter.get(
  "/:hallId/availability",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminListAvailability
);

// -- Gallery --
adminHallRouter.post(
  "/:hallId/gallery",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminAddGalleryItem
);
adminHallRouter.delete(
  "/gallery/:itemId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminDeleteGalleryItem
);

// -- Offers --
adminHallRouter.post(
  "/:hallId/offers",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminCreateOffer
);
adminHallRouter.put(
  "/offers/:offerId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminUpdateOffer
);
adminHallRouter.delete(
  "/offers/:offerId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminDeleteOffer
);

// -- FAQs --
adminHallRouter.post(
  "/:hallId/faqs",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminCreateFaq
);
adminHallRouter.delete(
  "/faqs/:faqId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminDeleteFaq
);

// -- Reviews --
adminHallRouter.get(
  "/:hallId/reviews",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminListReviews
);
adminHallRouter.put(
  "/reviews/:reviewId/approve",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminApproveReview
);
adminHallRouter.put(
  "/reviews/:reviewId/reply",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminReplyToReview
);
adminHallRouter.delete(
  "/reviews/:reviewId",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminDeleteReview
);
adminHallRouter.delete(
  "/reviews/:reviewId/images",
  requireRole(...HALL_MANAGER_ROLES),
  hallController.adminRemoveReviewImage
);
