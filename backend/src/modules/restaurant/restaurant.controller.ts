import { Request, Response, NextFunction } from "express";
import * as restaurantService from "./restaurant.service";
import * as reservationService from "./reservation.service";
import * as contentService from "../content/content.service";
import { User } from "../auth/models/user.model";
import { uploadImageBuffer, deleteImageByPublicId } from "../../utils/cloudinary.util";
import { ApiError } from "../../utils/apiError.util";
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  menuQuerySchema,
  createDiningAreaSchema,
  updateDiningAreaSchema,
  setTableAvailabilitySchema,
  tableAvailabilityQuerySchema,
  createReservationSchema,
  cancelReservationSchema,
  updateReservationStatusSchema,
  createRestaurantReviewSchema,
} from "./restaurant.validation";

/**
 * Restaurant controllers. Same shape as hotel.controller.ts throughout: parse with
 * Zod, delegate to a service, `next(err)` to the central error handler, and return
 * the project's `{ success, data }` envelope.
 *
 * Reviews / gallery / FAQs / offers all go through the shared
 * `contentService` with `"restaurant"` — no restaurant-specific copies of those.
 */

function handleZodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.errors?.map((e: any) => ({ field: e.path.join("."), message: e.message })),
  });
}

// ================== PUBLIC: RESTAURANT ==================

export async function listRestaurants(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId as string | undefined;
    const restaurants = await restaurantService.listRestaurants({ branchId });
    res.status(200).json({ success: true, data: restaurants });
  } catch (err) {
    next(err);
  }
}

/**
 * The single aggregate the public site needs — mirrors the Hotel module's
 * getHotelDetails so the frontend can render a whole page from one request.
 */
export async function getRestaurantDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantBySlug(req.params.slug);
    const id = String(restaurant._id);

    const [
      menuCategories,
      menuItems,
      diningAreas,
      chefSpecials,
      todaysSpecials,
      gallery,
      faqs,
      offers,
      reviewSummary,
      reviews,
    ] = await Promise.all([
      restaurantService.listMenuCategories(id),
      restaurantService.listMenuItems(id),
      restaurantService.listDiningAreas(id),
      restaurantService.getChefSpecials(id),
      restaurantService.getTodaysSpecials(id),
      contentService.getGallery("restaurant", id),
      contentService.getFaqs("restaurant", id),
      contentService.getActiveOffers("restaurant", id),
      contentService.getReviewSummary("restaurant", id),
      contentService.getApprovedReviews("restaurant", id),
    ]);

    res.status(200).json({
      success: true,
      data: {
        restaurant,
        menuCategories,
        menuItems,
        diningAreas,
        chefSpecials,
        todaysSpecials,
        gallery,
        faqs,
        offers,
        reviewSummary,
        reviews,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: MENU ==================

export async function listMenuCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantBySlug(req.params.slug);
    const categories = await restaurantService.listMenuCategories(String(restaurant._id));
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

/** Menu search + veg/non-veg + price filters + specials, all via query params. */
export async function listMenuItems(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = menuQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    if (
      parsed.data.minPrice !== undefined &&
      parsed.data.maxPrice !== undefined &&
      parsed.data.minPrice > parsed.data.maxPrice
    ) {
      throw new ApiError(400, "minPrice cannot be greater than maxPrice.");
    }

    const restaurant = await restaurantService.getRestaurantBySlug(req.params.slug);
    const items = await restaurantService.listMenuItems(String(restaurant._id), parsed.data);
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function getChefSpecials(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantBySlug(req.params.slug);
    const items = await restaurantService.getChefSpecials(String(restaurant._id));
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function getTodaysSpecials(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantBySlug(req.params.slug);
    const items = await restaurantService.getTodaysSpecials(String(restaurant._id));
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: DINING AREAS & AVAILABILITY ==================

export async function listDiningAreas(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantBySlug(req.params.slug);
    const areas = await restaurantService.listDiningAreas(String(restaurant._id));
    res.status(200).json({ success: true, data: areas });
  } catch (err) {
    next(err);
  }
}

/** Availability for one area at one slot. */
export async function checkTableAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = tableAvailabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);
    if (!parsed.data.timeSlot) {
      throw new ApiError(400, "timeSlot is required when checking a single dining area.");
    }

    const area = await restaurantService.getDiningAreaById(req.params.areaId);
    const availableTables = await restaurantService.getAvailableTables(
      req.params.areaId,
      new Date(parsed.data.date),
      parsed.data.timeSlot
    );

    const tablesNeeded = parsed.data.partySize
      ? restaurantService.tablesNeededFor(parsed.data.partySize, area.maxPartySize)
      : 1;

    res.status(200).json({
      success: true,
      data: { availableTables, tablesNeeded, canReserve: availableTables >= tablesNeeded },
    });
  } catch (err) {
    next(err);
  }
}

/** Availability across every area and slot for a date — the Table Availability grid. */
export async function getDayAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = tableAvailabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const restaurant = await restaurantService.getRestaurantBySlug(req.params.slug);
    const availability = await restaurantService.getDayAvailability(
      String(restaurant._id),
      new Date(parsed.data.date),
      parsed.data.partySize
    );

    res.status(200).json({
      success: true,
      data: { date: parsed.data.date, slots: restaurant.reservationSlots, areas: availability },
    });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: RESERVATIONS ==================

export async function createReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createReservationSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    // optionalAuthenticate populates req.actor when a token is present; a guest
    // reservation proceeds without one, per RULES.md (never force login).
    const reservation = await reservationService.createReservation(parsed.data, req.actor?.id);
    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
}

export async function getReservationByReference(req: Request, res: Response, next: NextFunction) {
  try {
    const reservation = await reservationService.getReservationByReference(req.params.reference);
    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
}

export async function getMyReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const reservations = await reservationService.getReservationsForUser(req.actor!.id);
    res.status(200).json({ success: true, data: reservations });
  } catch (err) {
    next(err);
  }
}

export async function cancelReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = cancelReservationSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    if (!req.actor?.id && !parsed.data.guestEmail) {
      throw new ApiError(
        400,
        "Please provide the email address used for the reservation to confirm it's yours."
      );
    }

    const reservation = await reservationService.cancelReservation(
      req.params.reference,
      { guestEmail: parsed.data.guestEmail, userId: req.actor?.id },
      parsed.data.cancellationReason
    );
    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: REVIEWS ==================

export async function createRestaurantReview(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createRestaurantReviewSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const restaurant = await restaurantService.getRestaurantById(req.params.restaurantId);

    // Logged-in: use the account's real name. Guest: guestName is required.
    // Identical policy to the Hotel module's createHotelReview.
    let guestName = parsed.data.guestName;
    if (req.actor?.id) {
      const user = await User.findById(req.actor.id).select("name");
      if (user) guestName = user.name;
    } else if (!guestName) {
      throw new ApiError(400, "Please provide your name with the review.");
    }

    const review = await contentService.createReview({
      userId: req.actor?.id,
      guestName,
      reviewableType: "restaurant",
      reviewableId: String(restaurant._id),
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      images: parsed.data.images,
    });

    res.status(201).json({
      success: true,
      message: "Thank you! Your review will appear once approved.",
      data: review,
    });
  } catch (err) {
    next(err);
  }
}

/** Public review-photo upload. Reuses the shared Cloudinary utility. */
export async function uploadReviewImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new ApiError(400, "No image file was provided.");
    const result = await uploadImageBuffer(req.file.buffer, "7vachan/restaurant/reviews");
    res.status(201).json({ success: true, data: { url: result.url, publicId: result.publicId } });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: RESTAURANT ==================

export async function adminCreateRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createRestaurantSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const restaurant = await restaurantService.createRestaurant(parsed.data);
    res.status(201).json({ success: true, data: restaurant });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateRestaurantSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const restaurant = await restaurantService.updateRestaurant(
      req.params.restaurantId,
      parsed.data
    );
    res.status(200).json({ success: true, data: restaurant });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteRestaurant(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.deleteRestaurant(req.params.restaurantId);
    res.status(200).json({ success: true, message: "Restaurant deactivated.", data: restaurant });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: MENU CATEGORIES ==================

export async function adminCreateMenuCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createMenuCategorySchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const category = await restaurantService.createMenuCategory(
      req.params.restaurantId,
      parsed.data
    );
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateMenuCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateMenuCategorySchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const category = await restaurantService.updateMenuCategory(req.params.categoryId, parsed.data);
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteMenuCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await restaurantService.deleteMenuCategory(req.params.categoryId);
    res.status(200).json({ success: true, message: "Category removed.", data: category });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: MENU ITEMS ==================

export async function adminCreateMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createMenuItemSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const item = await restaurantService.createMenuItem(req.params.restaurantId, parsed.data);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function adminGetMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await restaurantService.getMenuItemById(req.params.itemId);
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateMenuItemSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const item = await restaurantService.updateMenuItem(req.params.itemId, parsed.data);
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await restaurantService.deleteMenuItem(req.params.itemId);
    res.status(200).json({ success: true, message: "Menu item removed.", data: item });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: DINING AREAS ==================

export async function adminCreateDiningArea(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createDiningAreaSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const area = await restaurantService.createDiningArea(req.params.restaurantId, parsed.data);
    res.status(201).json({ success: true, data: area });
  } catch (err) {
    next(err);
  }
}

export async function adminGetDiningArea(req: Request, res: Response, next: NextFunction) {
  try {
    const area = await restaurantService.getDiningAreaById(req.params.areaId);
    res.status(200).json({ success: true, data: area });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateDiningArea(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateDiningAreaSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const area = await restaurantService.updateDiningArea(req.params.areaId, parsed.data);
    res.status(200).json({ success: true, data: area });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteDiningArea(req: Request, res: Response, next: NextFunction) {
  try {
    const area = await restaurantService.deleteDiningArea(req.params.areaId);
    res.status(200).json({ success: true, message: "Dining area removed.", data: area });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: AVAILABILITY ==================

export async function adminSetTableAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = setTableAvailabilitySchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const record = await restaurantService.setTableAvailability(req.params.areaId, parsed.data);
    res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function adminListTableAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const records = await restaurantService.listTableAvailability(req.params.areaId);
    res.status(200).json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: RESERVATIONS ==================

export async function adminListReservations(req: Request, res: Response, next: NextFunction) {
  try {
    const reservations = await reservationService.listReservationsForAdmin({
      restaurantId: req.query.restaurantId as string | undefined,
      status: req.query.status as string | undefined,
      date: req.query.date as string | undefined,
    });
    res.status(200).json({ success: true, data: reservations });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateReservationStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = updateReservationStatusSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const reservation = await reservationService.updateReservationStatus(
      req.params.reservationId,
      parsed.data.status
    );
    res.status(200).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: MEDIA ==================

export async function adminUploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new ApiError(400, "No image file was provided.");
    const folder = (req.query.folder as string) || "misc";
    const result = await uploadImageBuffer(req.file.buffer, `7vachan/restaurant/${folder}`);
    res.status(201).json({ success: true, data: { url: result.url, publicId: result.publicId } });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteImage(req: Request, res: Response, next: NextFunction) {
  try {
    const publicId = (req.body?.publicId as string) || (req.query.publicId as string);
    if (!publicId) throw new ApiError(400, "publicId is required.");
    await deleteImageByPublicId(publicId);
    res.status(200).json({ success: true, message: "Image deleted." });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: CONTENT (shared module) ==================

export async function adminAddGalleryItem(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantById(req.params.restaurantId);
    const item = await contentService.addGalleryItem({
      ownerType: "restaurant",
      ownerId: String(restaurant._id),
      imageUrl: req.body.imageUrl,
      title: req.body.title,
      category: req.body.category,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteGalleryItem(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteGalleryItem(req.params.itemId);
    res.status(200).json({ success: true, message: "Gallery item deleted." });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateFaq(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantById(req.params.restaurantId);
    const faq = await contentService.createFaq({
      applicableTo: "restaurant",
      ownerId: String(restaurant._id),
      question: req.body.question,
      answer: req.body.answer,
    });
    res.status(201).json({ success: true, data: faq });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteFaq(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteFaq(req.params.faqId);
    res.status(200).json({ success: true, message: "FAQ deleted." });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantById(req.params.restaurantId);
    // Field set matches the shared contentService.createOffer signature exactly —
    // the same call the Hotel module makes. The shared service is not extended
    // here (no `discountPercent`): changing it would alter a contract the
    // completed Hotel module already depends on.
    const offer = await contentService.createOffer({
      applicableTo: "restaurant",
      ownerId: String(restaurant._id),
      title: req.body.title,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      validFrom: new Date(req.body.validFrom),
      validTo: new Date(req.body.validTo),
    });
    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const offer = await contentService.updateOffer(req.params.offerId, req.body);
    res.status(200).json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteOffer(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteOffer(req.params.offerId);
    res.status(200).json({ success: true, message: "Offer deleted." });
  } catch (err) {
    next(err);
  }
}

export async function adminListReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const restaurant = await restaurantService.getRestaurantById(req.params.restaurantId);
    const reviews = await contentService.getAllReviewsForAdmin(
      "restaurant",
      String(restaurant._id)
    );
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

export async function adminApproveReview(req: Request, res: Response, next: NextFunction) {
  try {
    const review = await contentService.approveReview(req.params.reviewId);
    res.status(200).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

export async function adminReplyToReview(req: Request, res: Response, next: NextFunction) {
  try {
    const review = await contentService.replyToReview(req.params.reviewId, req.body.reply);
    res.status(200).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteReview(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteReview(req.params.reviewId);
    res.status(200).json({ success: true, message: "Review deleted." });
  } catch (err) {
    next(err);
  }
}
