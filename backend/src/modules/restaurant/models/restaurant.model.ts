import { Schema, model, Document, Types } from "mongoose";

/**
 * A restaurant at a branch. Mirrors hotel.model.ts's shape and conventions
 * deliberately — same branchId multi-tenancy, same slug/isActive/meta pattern —
 * so the two verticals stay predictable to work on.
 */

export interface IRestaurantFeature {
  name: string;
  icon?: string;
}

/**
 * Opening hours per weekday. Stored as data rather than derived from a single
 * open/close pair, because real restaurants close on a weekday, run split
 * lunch/dinner service, and change hours seasonally.
 * `dayOfWeek`: 0 = Sunday … 6 = Saturday (matches JS `Date.getDay()`).
 */
export interface IServiceHours {
  dayOfWeek: number;
  openTime: string; // "12:00"
  closeTime: string; // "23:00"
  isClosed: boolean;
  /** Optional label for split service, e.g. "Lunch" / "Dinner". */
  label?: string;
}

export interface IRestaurant extends Document {
  branchId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  cuisineTypes: string[];
  serviceHours: IServiceHours[];
  /**
   * Bookable time slots, e.g. ["12:00","12:30",…,"22:00"]. Admin-configurable
   * rather than generated from a hardcoded interval, per AI_INSTRUCTIONS.md §15
   * ("configuration must be data-driven, not hardcoded constants").
   */
  reservationSlots: string[];
  /** How long a table is held, used when computing slot availability. */
  reservationDurationMinutes: number;
  /** Guests may not reserve for a party larger than this without calling. */
  maxPartySize: number;
  address: string;
  geoLat?: number;
  geoLng?: number;
  contactPhone: string;
  contactEmail: string;
  /** WhatsApp number for the reservation CTA; falls back to contactPhone. */
  whatsappNumber?: string;
  features: IRestaurantFeature[];
  images: string[];
  averageCostForTwo?: number;
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantFeatureSchema = new Schema<IRestaurantFeature>(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String },
  },
  { _id: false }
);

const serviceHoursSchema = new Schema<IServiceHours>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
    isClosed: { type: Boolean, default: false },
    label: { type: String, trim: true },
  },
  { _id: false }
);

const restaurantSchema = new Schema<IRestaurant>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true },
    cuisineTypes: { type: [String], default: [] },
    serviceHours: { type: [serviceHoursSchema], default: [] },
    reservationSlots: { type: [String], default: [] },
    reservationDurationMinutes: { type: Number, default: 90, min: 15 },
    maxPartySize: { type: Number, default: 12, min: 1 },
    address: { type: String, required: true },
    geoLat: { type: Number },
    geoLng: { type: Number },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, required: true },
    whatsappNumber: { type: String, trim: true },
    features: { type: [restaurantFeatureSchema], default: [] },
    images: { type: [String], default: [] },
    averageCostForTwo: { type: Number, min: 0 },
    metaTitle: { type: String },
    metaDescription: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Restaurant = model<IRestaurant>("Restaurant", restaurantSchema);
