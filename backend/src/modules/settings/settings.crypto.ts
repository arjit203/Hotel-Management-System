import crypto from "crypto";

/**
 * Encryption for settings secrets (SMTP password, Razorpay key secret, …).
 *
 * AES-256-GCM, which is authenticated: a ciphertext that has been tampered with
 * fails to decrypt rather than returning plausible garbage. Output is
 * `v1:<iv>:<authTag>:<ciphertext>`, all base64, with the version prefix so a
 * future algorithm change can recognise and migrate old rows instead of
 * throwing on them.
 *
 * ── Where the key comes from ──
 * `SETTINGS_SECRET_KEY` if set. If it is not, the key is derived from
 * `ADMIN_JWT_SECRET` via scrypt with a fixed salt. That fallback exists so the
 * feature works on an install that has not added a new env var yet — but it
 * ties the settings secrets to the JWT secret, so **rotating `ADMIN_JWT_SECRET`
 * makes stored secrets undecryptable**. Set `SETTINGS_SECRET_KEY` in production
 * and the two become independent.
 *
 * Decryption failures are never fatal: `decrypt()` returns `null` and every
 * caller falls back to the environment variable. A key rotation degrades the
 * platform to its `.env` configuration rather than taking payments and email
 * offline.
 */

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const SCRYPT_SALT = "7vachan.settings.v1";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const explicit = process.env.SETTINGS_SECRET_KEY;
  const source = explicit || process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

  if (!source) {
    throw new Error(
      "Cannot encrypt settings: set SETTINGS_SECRET_KEY (or ADMIN_JWT_SECRET) in the environment."
    );
  }

  cachedKey = crypto.scryptSync(source, SCRYPT_SALT, 32);
  return cachedKey;
}

/** Exposed for tests and for the (unlikely) case of an in-process key change. */
export function resetKeyCache(): void {
  cachedKey = null;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(
    ":"
  );
}

/** Returns `null` for anything that cannot be decrypted — never throws. */
export function decrypt(payload: string): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = payload.split(":");
    if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) return null;

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * The masked form shown after saving: enough to recognise the value, not enough
 * to reconstruct it. Short secrets are masked entirely rather than half-shown.
 */
export function maskHint(plaintext: string): string {
  if (plaintext.length <= 8) return "••••••••";
  return `••••••••${plaintext.slice(-4)}`;
}
