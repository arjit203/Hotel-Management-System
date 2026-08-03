import { Schema, model, Document, Types } from "mongoose";

/**
 * Platform settings — one document per category.
 *
 * ── Why a category document instead of one row per key ──
 * A key/value collection means one query per field and a migration every time
 * the CMS grows a text box. A category document is read once, cached, and
 * handed to the page whole; adding a field to the Homepage CMS is a change to
 * `settings.defaults.ts` and nothing else. The cost is that `values` is
 * schemaless, so validation lives in `settings.validation.ts` rather than in
 * Mongoose — which is where every other module in this codebase validates too.
 *
 * ── Why secrets live in a separate map ──
 * `values` is returned to the admin panel verbatim, and its public subset is
 * returned to anyone. A secret that lived in `values` would leak the first time
 * someone added a category to the public list. Keeping ciphertext in its own
 * field makes that mistake impossible: the read path never merges `secrets`
 * into a response, it merges `secretHints`.
 */

export const SETTING_CATEGORIES = [
  "general",
  "business",
  "branding",
  "contact",
  "social",
  "homepage",
  "theme",
  "booking",
  "payment",
  "email",
  "seo",
  "legal",
  "features",
  "integrations",
  "maintenance",
] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

/**
 * Categories the public website may read without a token.
 *
 * `payment`, `email` and `integrations` are absent deliberately — they hold
 * gateway policy, recipient addresses and credentials. Everything else is copy,
 * imagery or a flag the browser needs anyway to render the page correctly.
 *
 * `maintenance` is public because the site cannot show a maintenance page
 * without being told to, and `booking` is public because advance percentage and
 * the cancellation window are quoted to the guest before they pay.
 */
export const PUBLIC_SETTING_CATEGORIES: SettingCategory[] = [
  "general",
  "business",
  "branding",
  "contact",
  "social",
  "homepage",
  "theme",
  "booking",
  "seo",
  "legal",
  "features",
  "maintenance",
];

export interface ISetting extends Document {
  category: SettingCategory;
  /** Plain, non-sensitive configuration. Safe to return as-is. */
  values: Record<string, unknown>;
  /** key → AES-256-GCM ciphertext. Never returned by any endpoint. */
  secrets: Map<string, string>;
  /**
   * key → the last four characters of the plaintext, so the UI can render
   * `••••••••3f2a` and an admin can tell at a glance *which* key is saved
   * without the value being recoverable from the hint.
   */
  secretHints: Map<string, string>;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    category: {
      type: String,
      enum: SETTING_CATEGORIES,
      required: true,
      unique: true,
      index: true,
    },
    values: { type: Schema.Types.Mixed, default: {} },
    secrets: { type: Map, of: String, default: {}, select: false },
    secretHints: { type: Map, of: String, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true }
);

export const Setting = model<ISetting>("Setting", settingSchema);
