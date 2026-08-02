import { Schema, model, Document, Types } from "mongoose";

/**
 * A bookable package tier — Silver / Gold / Premium / Royal.
 *
 * `priceLabel` is a FREE TEXT STRING, not a number, and that is deliberate: the
 * owner has not set pricing (see the Phase 4 brief, "No fixed prices. Admin
 * should configure later"). A numeric field would invite a placeholder value
 * that then leaks onto the public site as if it were real. A string lets the
 * venue publish "On request" or "Starting from ₹X per plate" and change its mind
 * without a schema migration.
 *
 * Nothing here is charged. Hall bookings are enquiry-first per `RULES.md` §14.
 */

export interface IHallPackage extends Document {
  hallId: Types.ObjectId;
  name: string;
  /** Lowercase key — "silver", "royal". Unique per hall. */
  slug: string;
  tagline?: string;
  description: string;

  /** What the tier includes, rendered as a checklist. */
  inclusions: string[];
  /** Short differentiators shown on the card. */
  highlights: string[];

  /** Free text, never a number. See the note above. */
  priceLabel: string;
  /** Guest range this tier is designed around. Purely informational. */
  suitableForMinGuests?: number;
  suitableForMaxGuests?: number;

  imageUrl?: string;
  images: string[];
  /** Renders the "Most chosen" ribbon on exactly one card. */
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hallPackageSchema = new Schema<IHallPackage>(
  {
    hallId: { type: Schema.Types.ObjectId, ref: "Hall", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    tagline: { type: String, trim: true },
    description: { type: String, required: true },

    inclusions: { type: [String], default: [] },
    highlights: { type: [String], default: [] },

    priceLabel: { type: String, default: "On request", trim: true },
    suitableForMinGuests: { type: Number, min: 0 },
    suitableForMaxGuests: { type: Number, min: 0 },

    imageUrl: { type: String, trim: true },
    images: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Slug uniqueness is per hall, not global — two venues may both have "royal".
hallPackageSchema.index({ hallId: 1, slug: 1 }, { unique: true });

export const HallPackage = model<IHallPackage>("HallPackage", hallPackageSchema);
