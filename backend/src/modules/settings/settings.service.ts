import { Setting, SettingCategory, SETTING_CATEGORIES, PUBLIC_SETTING_CATEGORIES } from "./models/setting.model";
import { SETTING_DEFAULTS, SECRET_KEYS, ENV_MIRROR, defaultsFor } from "./settings.defaults";
import { encrypt, decrypt, maskHint } from "./settings.crypto";
import { resetEmailTransport } from "../../utils/email.util";
import { ApiError } from "../../utils/apiError.util";

/**
 * Settings service.
 *
 * Three things worth knowing before changing anything here:
 *
 * 1. **Reads are cached in process.** The public site hits settings on nearly
 *    every server-rendered page; going to Mongo each time would add a round
 *    trip to every request for data that changes a few times a month. The cache
 *    is invalidated on write, and it is per-process — with more than one
 *    backend instance a save takes up to `CACHE_TTL_MS` to reach the others,
 *    which is an acceptable trade for copy and colours. Do not cache anything
 *    here that must be strongly consistent.
 *
 * 2. **A stored value never replaces a default wholesale.** Reads merge the
 *    document over `SETTING_DEFAULTS`, key by key, so a field added to the
 *    defaults file appears immediately on installs whose document predates it.
 *
 * 3. **Secrets are write-only.** They go in through `updateCategory`, are
 *    encrypted, and come back out only as a mask. The one path that sees
 *    plaintext is `resolveSecret`, used to mirror credentials into
 *    `process.env` — never to build a response.
 */

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  values: Record<string, unknown>;
  hints: Record<string, string>;
  expiresAt: number;
}

const cache = new Map<SettingCategory, CacheEntry>();

export function invalidateCache(category?: SettingCategory): void {
  if (category) cache.delete(category);
  else cache.clear();
}

function isSecretKey(category: SettingCategory, key: string): boolean {
  return (SECRET_KEYS[category] ?? []).includes(key);
}

/**
 * Merges a stored document over the defaults.
 *
 * Only keys the defaults declare are kept. That is deliberate: it means a
 * renamed field stops being served the moment it is renamed here, rather than
 * lingering in old documents and quietly shadowing its replacement, and it
 * stops a stray write from adding arbitrary keys to a public response.
 */
function mergeWithDefaults(
  category: SettingCategory,
  stored: Record<string, unknown> | undefined
): Record<string, unknown> {
  const merged = defaultsFor(category);
  if (!stored) return merged;

  for (const key of Object.keys(merged)) {
    if (stored[key] !== undefined) merged[key] = stored[key];
  }
  return merged;
}

/** One category, defaults merged in, secrets replaced by their masks. */
export async function getCategory(
  category: SettingCategory
): Promise<{ values: Record<string, unknown>; secretHints: Record<string, string> }> {
  const cached = cache.get(category);
  if (cached && cached.expiresAt > Date.now()) {
    return { values: { ...cached.values }, secretHints: { ...cached.hints } };
  }

  const doc = await Setting.findOne({ category });
  const values = mergeWithDefaults(category, doc?.values as Record<string, unknown> | undefined);
  const hints: Record<string, string> = {};

  for (const key of SECRET_KEYS[category] ?? []) {
    // A secret's own slot in `values` always reads back blank — the mask is the
    // only representation that leaves this service.
    values[key] = "";
    const hint = doc?.secretHints?.get(key);
    if (hint) hints[key] = hint;
  }

  cache.set(category, { values: { ...values }, hints: { ...hints }, expiresAt: Date.now() + CACHE_TTL_MS });
  return { values, secretHints: hints };
}

/** Every category — the admin panel's Settings page loads this in one call. */
export async function getAllCategories(): Promise<
  Record<string, { values: Record<string, unknown>; secretHints: Record<string, string> }>
> {
  const out: Record<string, { values: Record<string, unknown>; secretHints: Record<string, string> }> = {};
  for (const category of SETTING_CATEGORIES) {
    out[category] = await getCategory(category);
  }
  return out;
}

/**
 * The subset any visitor may read.
 *
 * Driven by `PUBLIC_SETTING_CATEGORIES` rather than by an allowlist of keys, so
 * a new field is public or not depending on which category it was put in — one
 * decision, made once, in a place a reviewer will look. Secrets are stripped by
 * `getCategory` before this ever sees them, so a mistake here leaks copy, not
 * credentials.
 */
export async function getPublicSettings(): Promise<Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const category of PUBLIC_SETTING_CATEGORIES) {
    out[category] = (await getCategory(category)).values;
  }
  return out;
}

/**
 * Writes one category.
 *
 * `values` is a partial patch: only the keys present are touched, so the admin
 * panel can save one tab without needing to hold the rest of the category. A
 * secret whose incoming value is an empty string is left as it was — that is
 * what makes "save the form again without retyping the password" work, since
 * the form only ever receives a mask. Clearing a secret is an explicit
 * `__clear__` sentinel.
 */
export async function updateCategory(
  category: SettingCategory,
  patch: Record<string, unknown>,
  adminId?: string
): Promise<{ values: Record<string, unknown>; secretHints: Record<string, string> }> {
  if (!SETTING_CATEGORIES.includes(category)) {
    throw new ApiError(404, `Unknown settings category "${category}".`);
  }

  const doc =
    (await Setting.findOne({ category }).select("+secrets")) ??
    new Setting({ category, values: {}, secrets: new Map(), secretHints: new Map() });

  const nextValues: Record<string, unknown> = { ...(doc.values as Record<string, unknown>) };
  const allowed = new Set(Object.keys(SETTING_DEFAULTS[category] ?? {}));

  for (const [key, value] of Object.entries(patch)) {
    // Unknown keys are dropped rather than rejected: an admin panel a version
    // ahead of the backend should save the fields the backend does know about,
    // not fail the whole form.
    if (!allowed.has(key)) continue;

    if (isSecretKey(category, key)) {
      const raw = typeof value === "string" ? value : "";
      if (raw === "__clear__") {
        doc.secrets.delete(key);
        doc.secretHints.delete(key);
      } else if (raw.trim().length > 0) {
        doc.secrets.set(key, encrypt(raw));
        doc.secretHints.set(key, maskHint(raw));
      }
      // Blank → unchanged. Never store a secret in `values`.
      continue;
    }

    nextValues[key] = value;
  }

  doc.values = nextValues;
  doc.updatedBy = (adminId as never) ?? null;
  doc.markModified("values");
  await doc.save();

  invalidateCache(category);

  // Credentials only matter once something can read them.
  if (category === "integrations") await applyIntegrationEnv();

  return getCategory(category);
}

/** Restores a category to `SETTING_DEFAULTS` by deleting its document. */
export async function resetCategory(category: SettingCategory): Promise<Record<string, unknown>> {
  await Setting.deleteOne({ category });
  invalidateCache(category);
  if (category === "integrations") await applyIntegrationEnv();
  return (await getCategory(category)).values;
}

/** Decrypted secret, or `null`. The only plaintext path out of this module. */
export async function resolveSecret(
  category: SettingCategory,
  key: string
): Promise<string | null> {
  const doc = await Setting.findOne({ category }).select("+secrets");
  const cipher = doc?.secrets?.get(key);
  return cipher ? decrypt(cipher) : null;
}

/**
 * Copies integration settings into `process.env`.
 *
 * This is the whole mechanism by which Settings reaches Razorpay, Cloudinary
 * and SMTP without a line changing in any of them: all three read
 * `process.env` at call time, not at import time (each file documents why).
 *
 * Blank values are skipped, so `.env` stays the fallback and a partially filled
 * Settings page cannot disable payments. A decryption failure — the realistic
 * one being a rotated `ADMIN_JWT_SECRET` while `SETTINGS_SECRET_KEY` is unset —
 * is likewise skipped rather than written as an empty string, degrading the
 * platform to its `.env` configuration instead of breaking it.
 *
 * Called on boot and after every save to `integrations`.
 */
export async function applyIntegrationEnv(): Promise<void> {
  const doc = await Setting.findOne({ category: "integrations" }).select("+secrets");
  if (!doc) return;

  const values = (doc.values ?? {}) as Record<string, unknown>;
  let smtpChanged = false;

  for (const [key, envName] of Object.entries(ENV_MIRROR)) {
    let raw: string | null = null;

    if (isSecretKey("integrations", key)) {
      const cipher = doc.secrets?.get(key);
      if (cipher) raw = decrypt(cipher);
    } else {
      const v = values[key];
      raw = typeof v === "string" ? v : v == null ? null : String(v);
    }

    if (raw && raw.trim().length > 0) {
      if (process.env[envName] !== raw) {
        process.env[envName] = raw;
        if (envName.startsWith("SMTP_") || envName === "EMAIL_FROM") smtpChanged = true;
      }
    }
  }

  // Nodemailer's transporter is built once and cached, so an SMTP change would
  // otherwise not be picked up until the process restarted.
  if (smtpChanged) resetEmailTransport();
}

/** True when the public site should render its maintenance page. */
export async function isMaintenanceMode(): Promise<boolean> {
  const { values } = await getCategory("maintenance");
  return values.maintenanceMode === true;
}
