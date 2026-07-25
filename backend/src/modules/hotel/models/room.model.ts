import { Schema, model, Document, Types } from "mongoose";

export type RoomCategoryName = "Deluxe" | "Executive" | "Luxury" | "Suite";

export interface IRoom extends Document {
  hotelId: Types.ObjectId;
  categoryName: RoomCategoryName;
  name: string;
  slug: string;
  description: string;
  images: string[];
  basePrice: number;
  maxOccupancy: number;
  totalRooms: number; // total physical rooms of this category in the hotel
  amenities: string[];
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    categoryName: {
      type: String,
      enum: ["Deluxe", "Executive", "Luxury", "Suite"],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true },
    images: { type: [String], default: [] },
    basePrice: { type: Number, required: true, min: 0 },
    maxOccupancy: { type: Number, required: true, min: 1 },
    totalRooms: { type: Number, required: true, min: 0 },
    amenities: { type: [String], default: [] },
    metaTitle: { type: String },
    metaDescription: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A room's slug only needs to be unique within its hotel (not globally).
roomSchema.index({ hotelId: 1, slug: 1 }, { unique: true });

export const Room = model<IRoom>("Room", roomSchema);
