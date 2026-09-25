import { Types } from "mongoose";
import { Review, ReviewableType } from "./models/review.model";
import { GalleryItem, GalleryOwnerType } from "./models/gallery.model";
import { Faq, FaqApplicableTo } from "./models/faq.model";
import { Offer, OfferApplicableTo } from "./models/offer.model";
import { ApiError } from "../../utils/apiError.util";

/**
 * Every admin mutation below takes the calling router's vertical and filters on
 * it. Content is polymorphic (one Review/GalleryItem/Faq/Offer collection for
 * all three businesses) and the ids are public (they ship in every page
 * aggregate), so an id alone must never be enough: without the vertical filter a
 * hotel_manager could moderate or delete a hall review through /admin/hotels.
 * A mismatch is reported as 404, never 403, so it reveals nothing.
 */
export type ContentVertical = "hotel" | "hall" | "restaurant";

/** Public list cap: a detail page renders the newest reviews, never the whole history. */
const PUBLIC_REVIEW_LIMIT = 50;

function isObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

function toObjectId(id: string, notFound: string): Types.ObjectId {
  if (!isObjectId(id)) throw new ApiError(404, notFound);
  return new Types.ObjectId(id);
}

// ---------- REVIEWS ----------
export async function getApprovedReviews(reviewableType: ReviewableType, reviewableId: string) {
  return Review.find({ reviewableType, reviewableId, isApproved: true })
    .sort({ createdAt: -1 })
    .limit(PUBLIC_REVIEW_LIMIT)
    .lean();
}

export async function getReviewSummary(reviewableType: ReviewableType, reviewableId: string) {
  if (!isObjectId(reviewableId)) return { average: 0, count: 0 };
  const [row] = await Review.aggregate<{ average: number; count: number }>([
    { $match: { reviewableType, reviewableId: new Types.ObjectId(reviewableId), isApproved: true } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (!row) return { average: 0, count: 0 };
  return { average: Math.round(row.average * 10) / 10, count: row.count };
}

export async function createReview(input: {
  userId?: string;
  guestName?: string;
  reviewableType: ReviewableType;
  reviewableId: string;
  rating: number;
  comment: string;
  images?: string[];
}) {
  return Review.create({
    ...input,
    images: input.images || [],
    userId: input.userId && isObjectId(input.userId) ? new Types.ObjectId(input.userId) : null,
    reviewableId: toObjectId(input.reviewableId, "Listing not found."),
  });
}

// ---------- REVIEWS (admin moderation) ----------
// All reviews (approved AND pending) for the admin panel's Reviews section —
// the public getApprovedReviews() above only returns already-approved ones.
export async function getAllReviewsForAdmin(reviewableType: ReviewableType, reviewableId: string) {
  // Capped: the moderation screen renders a list, and an unbounded find on a
  // popular listing grows without limit. Newest first, so the cap only ever
  // hides the oldest (long-since moderated) reviews.
  return Review.find({ reviewableType, reviewableId }).sort({ createdAt: -1 }).limit(500).lean();
}

export async function approveReview(vertical: ContentVertical, reviewId: string) {
  const review = await Review.findOneAndUpdate(
    { _id: toObjectId(reviewId, "Review not found."), reviewableType: vertical },
    { isApproved: true },
    { new: true }
  );
  if (!review) throw new ApiError(404, "Review not found.");
  return review;
}

export async function replyToReview(vertical: ContentVertical, reviewId: string, reply: string) {
  const review = await Review.findOneAndUpdate(
    { _id: toObjectId(reviewId, "Review not found."), reviewableType: vertical },
    { adminReply: reply },
    { new: true }
  );
  if (!review) throw new ApiError(404, "Review not found.");
  return review;
}

export async function deleteReview(vertical: ContentVertical, reviewId: string) {
  const review = await Review.findOneAndDelete({
    _id: toObjectId(reviewId, "Review not found."),
    reviewableType: vertical,
  });
  if (!review) throw new ApiError(404, "Review not found.");
  return review;
}

// Feature 5 (Phase 3.6): admin removes a single image from a review without
// deleting the whole review. DB-only (removes the URL from the images[]
// array) — matches the existing Gallery-item delete pattern in this codebase,
// which also doesn't call Cloudinary's destroy API on delete.
export async function removeReviewImage(vertical: ContentVertical, reviewId: string, imageUrl: string) {
  const review = await Review.findOneAndUpdate(
    { _id: toObjectId(reviewId, "Review not found."), reviewableType: vertical },
    { $pull: { images: imageUrl } },
    { new: true }
  );
  if (!review) throw new ApiError(404, "Review not found.");
  return review;
}

// ---------- GALLERY ----------
export async function getGallery(ownerType: GalleryOwnerType, ownerId: string) {
  return GalleryItem.find({ ownerType, ownerId, isActive: true }).sort({ displayOrder: 1 });
}

export async function addGalleryItem(input: {
  ownerType: GalleryOwnerType;
  ownerId: string;
  category: string;
  title?: string;
  imageUrl: string;
  displayOrder?: number;
}) {
  return GalleryItem.create({ ...input, ownerId: toObjectId(input.ownerId, "Listing not found.") });
}

export async function deleteGalleryItem(vertical: ContentVertical, id: string) {
  if (!isObjectId(id)) return null;
  return GalleryItem.findOneAndDelete({ _id: id, ownerType: vertical });
}

// ---------- FAQS ----------
export async function getFaqs(applicableTo: FaqApplicableTo, ownerId?: string) {
  const query: Record<string, unknown> = { applicableTo, isActive: true };
  if (ownerId) query.ownerId = ownerId;
  return Faq.find(query).sort({ displayOrder: 1 });
}

export async function createFaq(input: {
  applicableTo: FaqApplicableTo;
  ownerId?: string;
  question: string;
  answer: string;
  displayOrder?: number;
}) {
  return Faq.create(input);
}

export async function deleteFaq(vertical: ContentVertical, id: string) {
  if (!isObjectId(id)) return null;
  return Faq.findOneAndDelete({ _id: id, applicableTo: vertical });
}

// ---------- OFFERS ----------
export async function getActiveOffers(applicableTo: OfferApplicableTo, ownerId?: string) {
  const now = new Date();
  const query: Record<string, unknown> = {
    applicableTo,
    isActive: true,
    validFrom: { $lte: now },
    validTo: { $gte: now },
  };
  if (ownerId) query.ownerId = ownerId;
  return Offer.find(query).sort({ validTo: 1 });
}

export async function createOffer(input: {
  branchId?: string;
  applicableTo: OfferApplicableTo;
  ownerId?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  validFrom: Date;
  validTo: Date;
}) {
  return Offer.create(input);
}

const OFFER_UPDATABLE = ["title", "description", "imageUrl", "validFrom", "validTo", "isActive"] as const;

/**
 * Only the fields above are ever written, whatever the caller passes, so a raw
 * request body can't move an offer to another owner/vertical (`applicableTo`,
 * `ownerId`, `branchId`) or smuggle in update operators.
 */
export async function updateOffer(vertical: ContentVertical, id: string, updates: Record<string, unknown>) {
  if (!isObjectId(id)) return null;
  const $set: Record<string, unknown> = {};
  for (const key of OFFER_UPDATABLE) {
    if (updates[key] !== undefined) $set[key] = updates[key];
  }
  return Offer.findOneAndUpdate({ _id: id, applicableTo: vertical }, { $set }, { new: true, runValidators: true });
}

export async function deleteOffer(vertical: ContentVertical, id: string) {
  if (!isObjectId(id)) return null;
  return Offer.findOneAndDelete({ _id: id, applicableTo: vertical });
}
