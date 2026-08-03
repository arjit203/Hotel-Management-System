import { z } from "zod";
import { SETTING_CATEGORIES } from "./models/setting.model";

/**
 * Settings validation.
 *
 * ── Why this is looser than every other module's schema ──
 * Elsewhere a Zod schema mirrors a Mongoose schema field for field. A settings
 * category is schemaless by design (see `setting.model.ts`), and writing a
 * 40-field schema per category would mean editing three files to add one text
 * box — the exact friction this module exists to remove.
 *
 * So the contract here is structural rather than per-field: the category must
 * be real, the patch must be a flat-ish JSON object, values must be JSON
 * primitives / arrays / small objects, and strings must be bounded so a paste
 * accident cannot write a megabyte into a document that is read on every page.
 *
 * The service provides the *safety* this schema does not: unknown keys are
 * dropped against `SETTING_DEFAULTS`, and secret keys are routed to the
 * encrypted map instead of `values`. A malformed patch therefore writes
 * nothing surprising even though the schema is permissive.
 */

/** Long enough for a markdown privacy policy, short of a denial-of-service. */
const MAX_STRING = 20_000;
const MAX_ARRAY_ITEMS = 60;

const jsonPrimitive = z.union([
  z.string().max(MAX_STRING),
  z.number(),
  z.boolean(),
  z.null(),
]);

/**
 * One level of nesting is allowed, which covers every real case:
 * `valuePoints: [{ icon, title, desc }]` and `amenities: [{ name, icon }]`.
 * Deeper structures are refused rather than silently stored, because nothing
 * reads them and they would be invisible in the admin UI.
 */
const jsonValue = z.union([
  jsonPrimitive,
  z.array(z.union([jsonPrimitive, z.record(jsonPrimitive)])).max(MAX_ARRAY_ITEMS),
  z.record(jsonPrimitive),
]);

export const settingsCategoryParamSchema = z.object({
  category: z.enum(SETTING_CATEGORIES as unknown as [string, ...string[]]),
});

export const updateSettingsSchema = z
  .record(jsonValue)
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Send at least one setting to update.",
  })
  .refine((obj) => Object.keys(obj).length <= 200, {
    message: "Too many keys in one update.",
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
