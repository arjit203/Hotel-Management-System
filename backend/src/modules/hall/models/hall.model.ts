import { Schema, model, Document, Types } from "mongoose";

/**
 * Marriage Hall / banquet venue.
 *
 * Mirrors hotel.model.ts and restaurant.model.ts: `branchId` multi-tenancy,
 * unique slug, `isActive` soft delete, optional SEO overrides.
 *
 * Note what is deliberately absent: no price, rate, tariff or payment field
 * anywhere on this model or its children. `RULES.md` §14 makes hall bookings
 * enquiry-first with admin approval before any money is discussed, and the
 * owner has not set catering or package pricing yet. Package pricing is a free
 * text `priceLabel` ("On request") so the venue can publish without committing
 * to numbers.
 */

export interface IHallFeature {
  name: string;
  icon?: string;
}

export interface IHallCapacity {
  /** Human label — "Main Banquet Hall", "Lawn", "Terrace". */
  label: string;
  seated: number;
  floating: number;
  description?: string;
}

export interface IHall extends Document {
  branchId: Types.ObjectId;
  name: string;
  slug: string;
  tagline?: string;
  description: string;

  /** Headline numbers shown on the landing page. */
  seatedCapacity: number;
  floatingCapacity: number;
  /** Per-space breakdown (hall, lawn, terrace…). */
  spaces: IHallCapacity[];

  eventTypes: string[];
  features: IHallFeature[];
  parkingCapacity?: number;
  /** Rooms available for the wedding party, if any. */
  guestRooms?: number;

  address: string;
  geoLat?: number;
  geoLng?: number;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber?: string;

  /** Hero/cover imagery. Gallery proper lives in the shared content module. */
  heroImages: string[];
  videoUrl?: string;

  /** Lead time the venue needs, surfaced on the enquiry form. */
  minimumNoticeDays: number;

  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hallFeatureSchema = new Schema<IHallFeature>(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, trim: true },
  },
  { _id: false }
);

const hallCapacitySchema = new Schema<IHallCapacity>(
  {
    label: { type: String, required: true, trim: true },
    seated: { type: Number, required: true, min: 0 },
    floating: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const hallSchema = new Schema<IHall>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    tagline: { type: String, trim: true },
    description: { type: String, required: true },

    seatedCapacity: { type: Number, required: true, min: 0 },
    floatingCapacity: { type: Number, required: true, min: 0 },
    spaces: { type: [hallCapacitySchema], default: [] },

    eventTypes: { type: [String], default: [] },
    features: { type: [hallFeatureSchema], default: [] },
    parkingCapacity: { type: Number, min: 0 },
    guestRooms: { type: Number, min: 0 },

    address: { type: String, required: true, trim: true },
    geoLat: { type: Number },
    geoLng: { type: Number },
    contactPhone: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    whatsappNumber: { type: String, trim: true },

    heroImages: { type: [String], default: [] },
    videoUrl: { type: String, trim: true },

    minimumNoticeDays: { type: Number, default: 7, min: 0 },

    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Hall = model<IHall>("Hall", hallSchema);
