import { Schema, model, Document, Types } from "mongoose";

export type GalleryOwnerType = "hotel" | "hall" | "restaurant";

export interface IGalleryItem extends Document {
  ownerType: GalleryOwnerType;
  ownerId: Types.ObjectId;
  category: string; // e.g. "room", "exterior", "banquet", "food" — free-form per vertical
  title?: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const galleryItemSchema = new Schema<IGalleryItem>(
  {
    ownerType: { type: String, enum: ["hotel", "hall", "restaurant"], required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
    category: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

galleryItemSchema.index({ ownerType: 1, ownerId: 1, isActive: 1, displayOrder: 1 });

export const GalleryItem = model<IGalleryItem>("GalleryItem", galleryItemSchema);
