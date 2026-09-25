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

/**
 * ── Per-key rules, for the few values that feed logic rather than copy ──
 *
 * The structural schema above is enough for text and colours. These keys are
 * different: a bad value doesn't look wrong, it breaks something downstream.
 * `hotelAdvancePercent: 0` creates a 0-paise Razorpay order (which the gateway
 * rejects, so nobody can book), and a malformed `canonicalUrl` is written into
 * every page's <link rel="canonical"> and the sitemap. Blank / null means
 * "not set" everywhere in this module, so it is always accepted.
 *
 * Kept as a table so adding a rule is one line, not a new schema per category.
 */
type KeyRule = (value: unknown) => string | null;

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

const absoluteHttpUrl: KeyRule = (value) => {
  if (isBlank(value)) return null;
  if (typeof value !== "string") return "Must be a URL.";
  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") return null;
  } catch {
    /* fall through */
  }
  return "Must be blank or a full http(s) URL, e.g. https://7vachan.com";
};

const percent1to100: KeyRule = (value) => {
  if (isBlank(value)) return null;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 1 || n > 100) return "Must be a number from 1 to 100.";
  return null;
};

const KEY_RULES: Partial<Record<string, Record<string, KeyRule>>> = {
  seo: { canonicalUrl: absoluteHttpUrl },
  booking: { hotelAdvancePercent: percent1to100 },
};

/** Per-key errors for one category's patch, in the usual `{ field, message }` shape. */
export function validateCategoryPatch(
  category: string,
  patch: Record<string, unknown>
): { field: string; message: string }[] {
  const rules = KEY_RULES[category];
  if (!rules) return [];
  const errors: { field: string; message: string }[] = [];
  for (const [key, rule] of Object.entries(rules)) {
    if (!(key in patch)) continue;
    const message = rule(patch[key]);
    if (message) errors.push({ field: key, message });
  }
  return errors;
}
