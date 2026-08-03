import { Request, Response, NextFunction } from "express";
import * as hallService from "./hall.service";
import * as enquiryService from "./enquiry.service";
import * as contentService from "../content/content.service";
import { User } from "../auth/models/user.model";
import { uploadImageBuffer, deleteImageByPublicId } from "../../utils/cloudinary.util";
import { ApiError } from "../../utils/apiError.util";
import type { HallShowcaseType } from "./models/hallShowcase.model";
import type { HallDateStatus } from "./models/hallAvailability.model";
import type { HallEnquiryStatus } from "./models/hallEnquiry.model";
import {
  createHallSchema,
  updateHallSchema,
  createHallPackageSchema,
  updateHallPackageSchema,
  createHallShowcaseSchema,
  updateHallShowcaseSchema,
  showcaseQuerySchema,
  setHallAvailabilitySchema,
  setHallAvailabilityRangeSchema,
  calendarQuerySchema,
  createHallEnquirySchema,
  cancelHallEnquirySchema,
  updateHallEnquiryStatusSchema,
  createHallReviewSchema,
} from "./hall.validation";

/**
 * Marriage Hall controllers. Same shape as hotel.controller.ts and
 * restaurant.controller.ts throughout: parse with Zod, delegate to a service,
 * `next(err)` to the central error handler, return `{ success, data }`.
 *
 * Reviews / gallery / FAQs / offers all go through the shared `contentService`
 * with `"hall"` — the polymorphic enums already accepted that value, so no
 * content model changed. There are no hall-specific copies of those four.
 */

function handleZodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.errors?.map((e: any) => ({ field: e.path.join("."), message: e.message })),
  });
}

// ================== PUBLIC: HALL ==================

export async function listHalls(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId as string | undefined;
    const halls = await hallService.listHalls({ branchId });
    res.status(200).json({ success: true, data: halls });
  } catch (err) {
    next(err);
  }
}

/**
 * The single aggregate the public site needs — mirrors getHotelDetails and
 * getRestaurantDetails so the whole landing page renders from one request.
 */
export async function getHallDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const hall = await hallService.getHallBySlug(req.params.slug);
    const id = String(hall._id);

    const [
      packages,
      decorationThemes,
      catering,
      dining,
      floral,
      gallery,
      faqs,
      offers,
      reviewSummary,
      reviews,
    ] = await Promise.all([
      hallService.listPackages(id),
      hallService.getShowcaseSection(id, "decoration"),
      hallService.getShowcaseSection(id, "catering"),
      hallService.getShowcaseSection(id, "dining"),
      hallService.getShowcaseSection(id, "floral"),
      contentService.getGallery("hall", id),
      contentService.getFaqs("hall", id),
      contentService.getActiveOffers("hall", id),
      contentService.getReviewSummary("hall", id),
      contentService.getApprovedReviews("hall", id),
    ]);

    res.status(200).json({
      success: true,
      data: {
        hall,
        packages,
        decorationThemes,
        catering,
        dining,
        floral,
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

export async function listPackages(req: Request, res: Response, next: NextFunction) {
  try {
    const hall = await hallService.getHallBySlug(req.params.slug);
    const packages = await hallService.listPackages(String(hall._id));
    res.status(200).json({ success: true, data: packages });
  } catch (err) {
    next(err);
  }
}

export async function listShowcases(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = showcaseQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const hall = await hallService.getHallBySlug(req.params.slug);
    const entries = await hallService.listShowcases(String(hall._id), parsed.data);
    res.status(200).json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
}

/** `GET /halls/:slug/showcase/:type` — one full section, grouped by category. */
export async function getShowcaseSection(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = showcaseQuerySchema.safeParse({ type: req.params.type });
    if (!parsed.success) return handleZodError(res, parsed.error);

    const hall = await hallService.getHallBySlug(req.params.slug);
    const section = await hallService.getShowcaseSection(
      String(hall._id),
      parsed.data.type as HallShowcaseType
    );
    res.status(200).json({ success: true, data: section });
  } catch (err) {
    next(err);
  }
}

/** Public availability calendar. Internal block reasons are never included. */
export async function getCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = calendarQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const hall = await hallService.getHallBySlug(req.params.slug);
    const calendar = await hallService.getCalendar(
      String(hall._id),
      parsed.data.year,
      parsed.data.month,
      parsed.data.months ?? 1,
      false
    );
    res.status(200).json({ success: true, data: calendar });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: REVIEWS ==================

export async function createHallReview(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createHallReviewSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    await hallService.getHallById(req.params.hallId);

    // A logged-in reviewer's account name wins over anything typed in the form.
    let guestName = parsed.data.guestName;
    if (req.actor?.id) {
      const user = await User.findById(req.actor.id).select("name");
      if (user?.name) guestName = user.name;
    }

    const review = await contentService.createReview({
      userId: req.actor?.id,
      guestName,
      reviewableType: "hall",
      reviewableId: req.params.hallId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      images: parsed.data.images,
    });

    res.status(201).json({
      success: true,
      message: "Thank you. Your review will appear once it has been approved.",
      data: review,
    });
  } catch (err) {
    next(err);
  }
}

/** Review photo upload — public, no auth (guests may review too). */
export async function uploadReviewImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new ApiError(400, "No image file was provided.");
    const result = await uploadImageBuffer(req.file.buffer, "7vachan/hall/reviews");
    res.status(201).json({ success: true, data: { url: result.url, publicId: result.publicId } });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: ENQUIRIES ==================

export async function createEnquiry(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createHallEnquirySchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const enquiry = await enquiryService.createEnquiry(parsed.data, req.actor?.id);

    res.status(201).json({
      success: true,
      // Wording matters here: this is not a booking confirmation.
      message:
        "Your enquiry has been received. Our event manager will call you shortly. Your date is not held until we confirm it with you.",
      data: enquiry,
    });
  } catch (err) {
    next(err);
  }
}

export async function getEnquiryByReference(req: Request, res: Response, next: NextFunction) {
  try {
    const enquiry = await enquiryService.getEnquiryByReference(req.params.reference);
    res.status(200).json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
}

export async function getMyEnquiries(req: Request, res: Response, next: NextFunction) {
  try {
    const enquiries = await enquiryService.getMyEnquiries(req.actor!.id);
    res.status(200).json({ success: true, data: enquiries });
  } catch (err) {
    next(err);
  }
}

export async function cancelEnquiry(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = cancelHallEnquirySchema.safeParse(req.body ?? {});
    if (!parsed.success) return handleZodError(res, parsed.error);

    const enquiry = await enquiryService.cancelEnquiry(
      req.params.reference,
      { guestEmail: parsed.data.guestEmail, userId: req.actor?.id },
      parsed.data.cancellationReason
    );

    res.status(200).json({ success: true, message: "Your enquiry has been withdrawn.", data: enquiry });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: HALL ==================

export async function adminCreateHall(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createHallSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const hall = await hallService.createHall(parsed.data);
    res.status(201).json({ success: true, message: "Marriage hall created.", data: hall });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateHall(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateHallSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const hall = await hallService.updateHall(req.params.hallId, parsed.data);
    res.status(200).json({ success: true, message: "Marriage hall updated.", data: hall });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteHall(req: Request, res: Response, next: NextFunction) {
  try {
    const hall = await hallService.deleteHall(req.params.hallId);
    res.status(200).json({ success: true, message: "Marriage hall deactivated.", data: hall });
  } catch (err) {
    next(err);
  }
}

/** Admin read — includes inactive halls, unlike the public list. */
export async function adminGetHall(req: Request, res: Response, next: NextFunction) {
  try {
    const hall = await hallService.getHallById(req.params.hallId);
    res.status(200).json({ success: true, data: hall });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: PACKAGES ==================

export async function adminCreatePackage(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createHallPackageSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const pkg = await hallService.createPackage(req.params.hallId, parsed.data);
    res.status(201).json({ success: true, message: "Package created.", data: pkg });
  } catch (err) {
    next(err);
  }
}

export async function adminGetPackage(req: Request, res: Response, next: NextFunction) {
  try {
    const pkg = await hallService.getPackageById(req.params.packageId);
    res.status(200).json({ success: true, data: pkg });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdatePackage(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateHallPackageSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const pkg = await hallService.updatePackage(req.params.packageId, parsed.data);
    res.status(200).json({ success: true, message: "Package updated.", data: pkg });
  } catch (err) {
    next(err);
  }
}

export async function adminDeletePackage(req: Request, res: Response, next: NextFunction) {
  try {
    const pkg = await hallService.deletePackage(req.params.packageId);
    res.status(200).json({ success: true, message: "Package removed.", data: pkg });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: SHOWCASES ==================

export async function adminListShowcases(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = showcaseQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const entries = await hallService.listShowcases(req.params.hallId, parsed.data);
    res.status(200).json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateShowcase(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createHallShowcaseSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const entry = await hallService.createShowcase(req.params.hallId, parsed.data);
    res.status(201).json({ success: true, message: "Showcase entry created.", data: entry });
  } catch (err) {
    next(err);
  }
}

export async function adminGetShowcase(req: Request, res: Response, next: NextFunction) {
  try {
    const entry = await hallService.getShowcaseById(req.params.showcaseId);
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateShowcase(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateHallShowcaseSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);
    const entry = await hallService.updateShowcase(req.params.showcaseId, parsed.data);
    res.status(200).json({ success: true, message: "Showcase entry updated.", data: entry });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteShowcase(req: Request, res: Response, next: NextFunction) {
  try {
    const entry = await hallService.deleteShowcase(req.params.showcaseId);
    res.status(200).json({ success: true, message: "Showcase entry removed.", data: entry });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: AVAILABILITY ==================

export async function adminGetCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = calendarQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    // includeReasons = true: staff need to see why a date is held.
    const calendar = await hallService.getCalendar(
      req.params.hallId,
      parsed.data.year,
      parsed.data.month,
      parsed.data.months ?? 1,
      true
    );
    res.status(200).json({ success: true, data: calendar });
  } catch (err) {
    next(err);
  }
}

export async function adminSetAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = setHallAvailabilitySchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const result = await hallService.setAvailability(req.params.hallId, {
      date: parsed.data.date,
      status: parsed.data.status as HallDateStatus,
      reason: parsed.data.reason,
    });
    res.status(200).json({ success: true, message: "Calendar updated.", data: result });
  } catch (err) {
    next(err);
  }
}

export async function adminSetAvailabilityRange(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = setHallAvailabilityRangeSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const result = await hallService.setAvailabilityRange(req.params.hallId, {
      from: parsed.data.from,
      to: parsed.data.to,
      status: parsed.data.status as HallDateStatus,
      reason: parsed.data.reason,
    });

    res.status(200).json({
      success: true,
      message:
        result.applied > 0
          ? `${result.applied} date(s) updated.`
          : `${result.cleared} override(s) cleared.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminListAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const overrides = await hallService.listAvailabilityOverrides(req.params.hallId);
    res.status(200).json({ success: true, data: overrides });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: ENQUIRIES ==================

export async function adminListEnquiries(req: Request, res: Response, next: NextFunction) {
  try {
    const enquiries = await enquiryService.listEnquiriesForAdmin({
      hallId: req.query.hallId as string | undefined,
      status: req.query.status as string | undefined,
      date: req.query.date as string | undefined,
    });
    res.status(200).json({ success: true, data: enquiries });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateEnquiryStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateHallEnquiryStatusSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const enquiry = await enquiryService.updateEnquiryStatus(
      req.params.enquiryId,
      parsed.data.status as HallEnquiryStatus,
      parsed.data.adminNotes
    );
    res.status(200).json({ success: true, message: "Enquiry updated.", data: enquiry });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: MEDIA ==================

export async function adminUploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new ApiError(400, "No image file was provided.");
    const folder = (req.query.folder as string) || "misc";
    const result = await uploadImageBuffer(req.file.buffer, `7vachan/hall/${folder}`);
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
    const { imageUrl, category, title, displayOrder } = req.body || {};
    if (!imageUrl || !category) {
      throw new ApiError(400, "imageUrl and category are required.");
    }
    const item = await contentService.addGalleryItem({
      ownerType: "hall",
      ownerId: req.params.hallId,
      imageUrl,
      category,
      title,
      displayOrder,
    });
    res.status(201).json({ success: true, message: "Gallery image added.", data: item });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteGalleryItem(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteGalleryItem(req.params.itemId);
    res.status(200).json({ success: true, message: "Gallery image removed." });
  } catch (err) {
    next(err);
  }
}

export async function adminCreateOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description, imageUrl, validFrom, validTo } = req.body || {};
    if (!title || !validFrom || !validTo) {
      throw new ApiError(400, "title, validFrom and validTo are required.");
    }
    const offer = await contentService.createOffer({
      applicableTo: "hall",
      ownerId: req.params.hallId,
      title,
      description,
      imageUrl,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
    });
    res.status(201).json({ success: true, message: "Offer created.", data: offer });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description, imageUrl, validFrom, validTo, isActive } = req.body || {};
    const offer = await contentService.updateOffer(req.params.offerId, {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(validFrom !== undefined ? { validFrom: new Date(validFrom) } : {}),
      ...(validTo !== undefined ? { validTo: new Date(validTo) } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    });
    if (!offer) throw new ApiError(404, "Offer not found.");
    res.status(200).json({ success: true, message: "Offer updated.", data: offer });
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

export async function adminCreateFaq(req: Request, res: Response, next: NextFunction) {
  try {
    const { question, answer, displayOrder } = req.body || {};
    if (!question || !answer) throw new ApiError(400, "question and answer are required.");
    const faq = await contentService.createFaq({
      applicableTo: "hall",
      ownerId: req.params.hallId,
      question,
      answer,
      displayOrder,
    });
    res.status(201).json({ success: true, message: "FAQ created.", data: faq });
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

export async function adminListReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await contentService.getAllReviewsForAdmin("hall", req.params.hallId);
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

export async function adminApproveReview(req: Request, res: Response, next: NextFunction) {
  try {
    const review = await contentService.approveReview(req.params.reviewId);
    res.status(200).json({ success: true, message: "Review approved.", data: review });
  } catch (err) {
    next(err);
  }
}

export async function adminReplyToReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { reply } = req.body || {};
    if (!reply) throw new ApiError(400, "reply is required.");
    const review = await contentService.replyToReview(req.params.reviewId, reply);
    res.status(200).json({ success: true, message: "Reply published.", data: review });
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

export async function adminRemoveReviewImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { imageUrl } = req.body || {};
    if (!imageUrl) throw new ApiError(400, "imageUrl is required.");
    const review = await contentService.removeReviewImage(req.params.reviewId, imageUrl);
    res.status(200).json({ success: true, message: "Photo removed.", data: review });
  } catch (err) {
    next(err);
  }
}
