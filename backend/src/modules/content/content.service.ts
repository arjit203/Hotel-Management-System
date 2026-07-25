import { Types } from "mongoose";
import { Review, ReviewableType } from "./models/review.model";
import { GalleryItem, GalleryOwnerType } from "./models/gallery.model";
import { Faq, FaqApplicableTo } from "./models/faq.model";
import { Offer, OfferApplicableTo } from "./models/offer.model";

// ---------- REVIEWS ----------
export async function getApprovedReviews(reviewableType: ReviewableType, reviewableId: string) {
  return Review.find({ reviewableType, reviewableId, isApproved: true }).sort({ createdAt: -1 });
}

export async function getReviewSummary(reviewableType: ReviewableType, reviewableId: string) {
  const reviews = await Review.find({ reviewableType, reviewableId, isApproved: true }).select("rating");
  const count = reviews.length;
  const average = count === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / count;
  return { average: Math.round(average * 10) / 10, count };
}

export async function createReview(input: {
  userId?: string;
  guestName?: string;
  reviewableType: ReviewableType;
  reviewableId: string;
  rating: number;
  comment: string;
}) {
  return Review.create({
    ...input,
    userId: input.userId ? new Types.ObjectId(input.userId) : null,
    reviewableId: new Types.ObjectId(input.reviewableId),
  });
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
  return GalleryItem.create({ ...input, ownerId: new Types.ObjectId(input.ownerId) });
}

export async function deleteGalleryItem(id: string) {
  return GalleryItem.findByIdAndDelete(id);
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

export async function deleteFaq(id: string) {
  return Faq.findByIdAndDelete(id);
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

export async function updateOffer(id: string, updates: Partial<{
  title: string;
  description: string;
  imageUrl: string;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
}>) {
  return Offer.findByIdAndUpdate(id, updates, { new: true });
}

export async function deleteOffer(id: string) {
  return Offer.findByIdAndDelete(id);
}
