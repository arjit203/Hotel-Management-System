import { Schema, model, Document, Types } from "mongoose";

/**
 * One model for all four editorial showcases the Marriage Hall site publishes:
 * decoration themes, catering, dining arrangements and floral decoration.
 *
 * ── Why one model rather than four ──
 * They are the same shape: a titled, illustrated, ordered card with a
 * description, a category, some bullet highlights and — for decoration — a
 * colour palette. Four near-identical models would mean four services, four
 * controller blocks, four route groups and four admin tabs that differ only by
 * a string. `AI_INSTRUCTIONS.md` §6/§15 require shared structure to live once;
 * this is the same reasoning that made `content.service.ts` polymorphic across
 * verticals.
 *
 * `showcaseType` selects the section; `category` sub-groups within it:
 *
 *   decoration → category is the theme family    ("Royal", "Minimal", "Floral")
 *   catering   → category is the cuisine group   ("Veg", "Desserts", "Live Counters")
 *   dining     → category is the arrangement     ("Buffet", "VIP", "Family")
 *   floral     → category is the surface         ("Mandap", "Entrance", "Ceiling")
 *
 * Fields that only some types use are optional rather than being pushed into a
 * loose `Mixed` bag, so they stay validated and queryable.
 *
 * NO PRICE FIELD. Catering pricing is explicitly unknown (Phase 4 brief) and
 * this is showcase content only — there is no ordering, cart or quote flow.
 */

export type HallShowcaseType = "decoration" | "catering" | "dining" | "floral";

export const HALL_SHOWCASE_TYPES: HallShowcaseType[] = [
  "decoration",
  "catering",
  "dining",
  "floral",
];

export interface IHallShowcase extends Document {
  hallId: Types.ObjectId;
  showcaseType: HallShowcaseType;
  /** Sub-group within the section. See the mapping above. */
  category: string;

  title: string;
  description: string;
  images: string[];

  /** Bullet points under the description. Used by every showcase type. */
  highlights: string[];

  /** Decoration themes only: hex swatches rendered as a palette strip. */
  colorPalette: string[];

  /** Catering only: representative dishes. Names only — never priced. */
  sampleItems: string[];

  /**
   * Decoration themes only: the "before" frame of a before/after pair.
   * When set, the gallery renders a draggable comparison against images[0].
   */
  beforeImageUrl?: string;

  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hallShowcaseSchema = new Schema<IHallShowcase>(
  {
    hallId: { type: Schema.Types.ObjectId, ref: "Hall", required: true, index: true },
    showcaseType: {
      type: String,
      enum: HALL_SHOWCASE_TYPES,
      required: true,
      index: true,
    },
    category: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    images: { type: [String], default: [] },

    highlights: { type: [String], default: [] },
    colorPalette: { type: [String], default: [] },
    sampleItems: { type: [String], default: [] },
    beforeImageUrl: { type: String, trim: true },

    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// The public site always reads one section of one hall at a time.
hallShowcaseSchema.index({ hallId: 1, showcaseType: 1, displayOrder: 1 });

export const HallShowcase = model<IHallShowcase>("HallShowcase", hallShowcaseSchema);
