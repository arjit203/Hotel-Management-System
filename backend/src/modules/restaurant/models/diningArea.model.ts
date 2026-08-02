import { Schema, model, Document, Types } from "mongoose";

export type DiningAreaType = "main" | "private" | "family" | "outdoor";

/**
 * A seating area a guest can reserve into — "Main Hall", "Private Dining",
 * "Family Section", "Terrace".
 *
 * This is the restaurant's analogue of Room: the unit that availability is
 * counted against. Reservations are held against an area's `totalTables`, not
 * against individually numbered tables, because the host reassigns specific
 * tables on the floor and modelling individual tables would encode a precision
 * the business doesn't actually operate at.
 *
 * Covers the requested Private Dining / Family Dining feature via `areaType`.
 */
export interface IDiningArea extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  slug: string;
  areaType: DiningAreaType;
  description: string;
  images: string[];
  /** Number of tables in this area — the availability ceiling. */
  totalTables: number;
  /** Largest party a single table here seats. */
  maxPartySize: number;
  minPartySize: number;
  /** Private rooms often carry a minimum spend; null where not applicable. */
  minimumSpend?: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const diningAreaSchema = new Schema<IDiningArea>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    areaType: {
      type: String,
      enum: ["main", "private", "family", "outdoor"],
      required: true,
    },
    description: { type: String, required: true },
    images: { type: [String], default: [] },
    totalTables: { type: Number, required: true, min: 0 },
    maxPartySize: { type: Number, required: true, min: 1 },
    minPartySize: { type: Number, default: 1, min: 1 },
    minimumSpend: { type: Number, min: 0 },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

diningAreaSchema.index({ restaurantId: 1, slug: 1 }, { unique: true });

export const DiningArea = model<IDiningArea>("DiningArea", diningAreaSchema);
