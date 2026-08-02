import { Schema, model, Document, Types } from "mongoose";

export type FoodType = "veg" | "non_veg" | "egg";
export type SpiceLevel = "mild" | "medium" | "hot";

/**
 * A single dish.
 *
 * This model backs menu browsing only. **No ordering, cart, checkout, delivery or
 * food payment** — `RULES.md` §2 places all of that in Phase 2, so there is
 * deliberately no quantity, cart, or order-line concept anywhere here.
 *
 * The flags cover the requested browse features directly:
 *   isChefSpecial   → the Chef Specials section
 *   isTodaysSpecial → Today's Special Menu
 *   foodType        → Veg / Non-Veg filters
 *   price           → price filters
 *   name/description/tags → menu search
 */
export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  foodType: FoodType;
  spiceLevel?: SpiceLevel;
  imageUrl?: string;
  /** Chef's recommendation — surfaced in its own section. */
  isChefSpecial: boolean;
  /** Rotates daily; admin toggles it. Surfaced as Today's Special. */
  isTodaysSpecial: boolean;
  /** Temporarily out of stock: still listed, shown as unavailable. */
  isAvailable: boolean;
  /** Free-text tags ("jain", "gluten-free", "bestseller") — also searched. */
  tags: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "MenuCategory", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    foodType: { type: String, enum: ["veg", "non_veg", "egg"], required: true },
    spiceLevel: { type: String, enum: ["mild", "medium", "hot"] },
    imageUrl: { type: String },
    isChefSpecial: { type: Boolean, default: false },
    isTodaysSpecial: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Text index so menu search is served by the database rather than by filtering
// the whole menu in application code.
menuItemSchema.index({ name: "text", description: "text", tags: "text" });
menuItemSchema.index({ restaurantId: 1, categoryId: 1, displayOrder: 1 });

export const MenuItem = model<IMenuItem>("MenuItem", menuItemSchema);
