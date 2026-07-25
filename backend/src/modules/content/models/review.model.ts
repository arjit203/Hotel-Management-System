import { Schema, model, Document, Types } from "mongoose";

export type ReviewableType = "hotel" | "hall" | "restaurant";

export interface IReview extends Document {
  userId?: Types.ObjectId | null;
  guestName?: string;
  reviewableType: ReviewableType;
  reviewableId: Types.ObjectId;
  rating: number;
  comment: string;
  isApproved: boolean;
  adminReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    guestName: { type: String, trim: true },
    reviewableType: { type: String, enum: ["hotel", "hall", "restaurant"], required: true },
    reviewableId: { type: Schema.Types.ObjectId, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    isApproved: { type: Boolean, default: false },
    adminReply: { type: String, trim: true },
  },
  { timestamps: true }
);

// Reused by every vertical (hotel/hall/restaurant) via reviewableType/reviewableId —
// per FOLDER_STRUCTURE.md / RULES.md scalability requirement: shared logic lives once.
reviewSchema.index({ reviewableType: 1, reviewableId: 1, isApproved: 1 });

export const Review = model<IReview>("Review", reviewSchema);
