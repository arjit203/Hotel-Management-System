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

const storedCache = new Map<string, { value: unknown; expiresAt: number }>();

export function invalidateCache(category?: SettingCategory): void {
  if (category) cache.delete(category);
  else cache.clear();
  // Stored-value lookups are keyed "category.key"; clear them all (cheap, rare).
  storedCache.clear();
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

/**
 * The value an admin actually saved for one key, or `undefined` if they never
 * saved one. Unlike `getCategory` this does NOT merge defaults: callers that
 * layer settings over env vars need to tell "admin chose 20" apart from "the
 * default happens to be 20", or an env override would be silently ignored.
 * Precedence used by callers: stored value, then env var, then built-in default.
 * Blank strings count as "not set", matching the frontend's `str()` rule.
 * Secret keys are never returned. Never throws: settings must not break a booking.
 */
export async function getStoredSettingValue(category: SettingCategory, key: string): Promise<unknown> {
  if (isSecretKey(category, key)) return undefined;
  const cacheKey = `${category}.${key}`;
  const hit = storedCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  let value: unknown;
  try {
    const doc = await Setting.findOne({ category }).select("values").lean();
    const raw = (doc?.values as Record<string, unknown> | undefined)?.[key];
    value = raw === "" || raw === null ? undefined : raw;
  } catch {
    value = undefined;
  }
  storedCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
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
/**
 * Keys that live in a public category but are not for visitors: operational
 * notes (when the last backup ran, what it said) and the owner's personal name.
 * Stripped here rather than by moving them, so the admin panel's tabs and every
 * stored document stay exactly as they are.
 */
const PUBLIC_HIDDEN_KEYS: Partial<Record<SettingCategory, string[]>> = {
  maintenance: ["lastBackupAt", "backupNote"],
  business: ["ownerName"],
};

export async function getPublicSettings(): Promise<Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const category of PUBLIC_SETTING_CATEGORIES) {
    // getCategory returns a copy, so deleting here never touches the cache.
    const values = (await getCategory(category)).values;
    for (const key of PUBLIC_HIDDEN_KEYS[category] ?? []) delete values[key];
    out[category] = values;
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
 * Blank values fall back to `.env`, so a partially filled Settings page cannot
 * disable payments. A decryption failure — the realistic one being a rotated
 * `ADMIN_JWT_SECRET` while `SETTINGS_SECRET_KEY` is unset — is treated as blank,
 * degrading the platform to its `.env` configuration instead of breaking it.
 *
 * "Falls back to `.env`" means the ORIGINAL `.env` value, snapshotted on the
 * first call (boot) before anything is overwritten. Without the snapshot,
 * clearing a field (or resetting the category) left the previously saved DB
 * value sitting in `process.env` until the next restart — the admin sees the
 * field empty while the old credentials keep being used. A variable that was
 * unset originally is deleted again. Values are never logged.
 *
 * Called on boot and after every save to `integrations`.
 */
let envSnapshot: Map<string, string | undefined> | null = null;

export async function applyIntegrationEnv(): Promise<void> {
  // Snapshot before the first read so a DB failure on boot can't skip it.
  if (!envSnapshot) {
    envSnapshot = new Map(Object.values(ENV_MIRROR).map((name) => [name, process.env[name]]));
  }

  const doc = await Setting.findOne({ category: "integrations" }).select("+secrets");

  const values = (doc?.values ?? {}) as Record<string, unknown>;
  let smtpChanged = false;

  for (const [key, envName] of Object.entries(ENV_MIRROR)) {
    let raw: string | null = null;

    if (isSecretKey("integrations", key)) {
      const cipher = doc?.secrets?.get(key);
      if (cipher) raw = decrypt(cipher);
    } else {
      const v = values[key];
      raw = typeof v === "string" ? v : v == null ? null : String(v);
    }

    // Blank / cleared / undecryptable → the original .env value (or unset).
    const next = raw && raw.trim().length > 0 ? raw : envSnapshot.get(envName);

    if (process.env[envName] !== next) {
      if (next === undefined) delete process.env[envName];
      else process.env[envName] = next;
      if (envName.startsWith("SMTP_") || envName === "EMAIL_FROM") smtpChanged = true;
    }
  }

  // Nodemailer's transporter is built once and cached, so an SMTP change would
  // otherwise not be picked up until the process restarted.
  if (smtpChanged) resetEmailTransport();
}

/**
 * True when the public site should render its maintenance page.
 *
 * NOTE: not yet enforced anywhere — nothing calls this, and neither the API nor
 * the public site blocks requests when `maintenanceMode` is on. The flag is
 * stored and served (the public site may read it from /settings), but treat it
 * as advisory until a middleware or the site's layout acts on it.
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const { values } = await getCategory("maintenance");
  return values.maintenanceMode === true;
}
