/**
 * Cloudinary delivery-URL sizing.
 *
 * ── The problem ──
 * The backend uploads with `quality: auto:good, fetch_format: auto`
 * (backend/src/utils/cloudinary.util.ts), which optimises FORMAT and COMPRESSION
 * but not DIMENSIONS. A 4000×3000 photo straight off a camera is still delivered
 * at 4000×3000 — into a 400px-wide room card. That's several megabytes per image,
 * and a room grid mounts a dozen of them, which is the 5–10s image load.
 *
 * ── The fix ──
 * Cloudinary applies transformations on the fly from the URL path and caches the
 * result on its CDN, so asking for a resized variant costs one slow request the
 * very first time and is edge-cached forever after.
 *
 *   .../image/upload/v123/folder/pic.jpg
 *   .../image/upload/f_auto,q_auto,w_800,c_limit,dpr_auto/v123/folder/pic.jpg
 *
 * This is purely a client-side URL change:
 *   • nothing stored in MongoDB changes — `imageUrl`/`images` still hold the
 *     original `secure_url`, exactly as AI_INSTRUCTIONS.md §21 requires
 *   • no backend, upload or admin-panel change
 *   • non-Cloudinary URLs are returned untouched, so nothing breaks if an image
 *     is ever hosted elsewhere
 *
 * `c_limit` only ever scales DOWN and never crops or upscales, so an admin's
 * chosen framing and aspect ratio are preserved. `dpr_auto` serves a sharper
 * variant to retina screens without us hard-coding 2x everywhere.
 */

export interface CldOptions {
  /** Target CSS width in px. The image is never upscaled beyond its original. */
  width?: number;
  /** Pass a height too when the slot is a fixed box and you want a crop-to-fill. */
  height?: number;
  /** Use `fill` for fixed-ratio tiles; defaults to `limit` (scale down only). */
  crop?: "limit" | "fill";
}

/** Widths we actually request. Keeping the set small maximises CDN cache hits. */
export const IMAGE_WIDTHS = {
  thumb: 160,
  card: 800,
  hero: 1920,
  full: 2400,
} as const;

export function cldImage(src: string, options: CldOptions = {}): string {
  if (!src) return src;

  // Only rewrite Cloudinary delivery URLs; leave anything else alone.
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) return src;

  // Already transformed (e.g. by an earlier call) — don't stack transformations.
  if (/\/upload\/[^/]*(?:w_|c_|f_auto|q_auto)/.test(src)) return src;

  const { width = IMAGE_WIDTHS.card, height, crop = "limit" } = options;

  const parts = [`f_auto`, `q_auto`, `c_${crop}`, `w_${width}`];
  if (height) parts.push(`h_${height}`);
  parts.push("dpr_auto");

  return src.replace("/upload/", `/upload/${parts.join(",")}/`);
}

/**
 * `srcset` for a responsive slot, so a phone never downloads a desktop-sized
 * image. Pair with a `sizes` attribute describing the slot's CSS width.
 */
export function cldSrcSet(src: string, widths: number[] = [400, 800, 1200]): string | undefined {
  if (!src || !src.includes("res.cloudinary.com")) return undefined;
  return widths.map((w) => `${cldImage(src, { width: w })} ${w}w`).join(", ");
}
