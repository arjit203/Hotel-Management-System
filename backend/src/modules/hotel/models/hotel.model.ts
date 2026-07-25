import { Schema, model, Document, Types } from "mongoose";

export interface IHotelAmenity {
  name: string;
  icon?: string;
}

export interface IHotel extends Document {
  branchId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  starRating: number;
  checkInTime: string; // e.g. "14:00"
  checkOutTime: string; // e.g. "11:00"
  address: string;
  geoLat?: number;
  geoLng?: number;
  contactPhone: string;
  contactEmail: string;
  amenities: IHotelAmenity[];
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hotelAmenitySchema = new Schema<IHotelAmenity>(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String },
  },
  { _id: false }
);

const hotelSchema = new Schema<IHotel>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true },
    starRating: { type: Number, min: 1, max: 5, default: 3 },
    checkInTime: { type: String, default: "14:00" },
    checkOutTime: { type: String, default: "11:00" },
    address: { type: String, required: true },
    geoLat: { type: Number },
    geoLng: { type: Number },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, required: true },
    amenities: { type: [hotelAmenitySchema], default: [] },
    metaTitle: { type: String },
    metaDescription: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Hotel = model<IHotel>("Hotel", hotelSchema);
