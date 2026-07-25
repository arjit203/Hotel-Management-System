import { Schema, model, Document, Types } from "mongoose";

export type OfferApplicableTo = "hotel" | "hall" | "restaurant" | "all";

export interface IOffer extends Document {
  branchId?: Types.ObjectId | null;
  applicableTo: OfferApplicableTo;
  ownerId?: Types.ObjectId | null; // specific hotel/hall/restaurant id, null = applies to all of that type
  title: string;
  description?: string;
  imageUrl?: string;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    applicableTo: { type: String, enum: ["hotel", "hall", "restaurant", "all"], required: true },
    ownerId: { type: Schema.Types.ObjectId, default: null, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

offerSchema.index({ applicableTo: 1, ownerId: 1, isActive: 1 });

export const Offer = model<IOffer>("Offer", offerSchema);
