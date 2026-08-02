import { Schema, model, Document, Types } from "mongoose";

/**
 * A section of the menu — "Starters", "Tandoor", "Desserts".
 *
 * Kept as its own collection rather than an enum (unlike Room's fixed
 * `categoryName`) because a restaurant's menu sections are genuinely
 * admin-authored and change with the seasons, whereas hotel room categories are a
 * fixed commercial ladder.
 */
export interface IMenuCategory extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  /** Menus have an intentional reading order; lower renders first. */
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Slug only needs to be unique within its restaurant — same rule as Room.
menuCategorySchema.index({ restaurantId: 1, slug: 1 }, { unique: true });

export const MenuCategory = model<IMenuCategory>("MenuCategory", menuCategorySchema);
