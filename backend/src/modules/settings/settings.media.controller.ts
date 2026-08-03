import { Request, Response, NextFunction } from "express";
import { uploadImageBuffer } from "../../utils/cloudinary.util";
import { ApiError } from "../../utils/apiError.util";

/**
 * Branding uploads (logo, favicon, hero media, OG image).
 *
 * Identical in shape to the hotel/restaurant/hall upload controllers — same
 * memory-storage multer instance, same `uploadImageBuffer`, same
 * `{ url, publicId }` response — differing only in the Cloudinary folder. It
 * lives in its own file purely so `settings.controller.ts` does not need to
 * import Cloudinary for one handler.
 *
 * Kept as a separate route (rather than reusing `/admin/hotels/upload-image`)
 * because that one is guarded by `HOTEL_MANAGER_ROLES`, and platform branding
 * is Super Admin territory. Reusing it would have granted a hotel manager a
 * path to write the site logo.
 */
export async function uploadSettingsImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new ApiError(400, "No image file was provided.");
    const folder = (req.query.folder as string) || "branding";
    const result = await uploadImageBuffer(req.file.buffer, `7vachan/settings/${folder}`);
    res.status(201).json({ success: true, data: { url: result.url, publicId: result.publicId } });
  } catch (err) {
    next(err);
  }
}
