// 7 Vachan - Cloudinary upload/delete helpers
// Shared utility (per AI_INSTRUCTIONS.md #15 — shared logic lives once).
// Currently consumed by the Hotel module only (per current phase scope);
// Hall/Restaurant modules should import these same functions later
// rather than re-implementing upload logic.

import type { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import { Readable } from "stream";
import { cloudinary, isCloudinaryConfigured, configureCloudinary } from "../config/cloudinary";
import { ApiError } from "./apiError.util";

export interface CloudinaryUploadResult {
  url: string; // secure_url — store this in Hotel/Room/Gallery/Offer imageUrl fields
  publicId: string; // store alongside url if you may need to delete the image later
  width: number;
  height: number;
  format: string;
  bytes: number;
}

// `folder` lets each vertical/module namespace its own images in Cloudinary
// (e.g. "7vachan/hotel/rooms", "7vachan/hotel/gallery") without extra config.
export function uploadImageBuffer(
  buffer: Buffer,
  folder: string
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    return Promise.reject(
      new ApiError(500, "Image storage is not configured on the server. Contact the administrator.")
    );
  }
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // Reasonable production defaults — keeps stored assets web-optimized
        // without altering the admin's originally uploaded aspect ratio/crop.
        transformation: [{ quality: "auto:good", fetch_format: "auto" }],
      },
(error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {        if (error || !result) {
          return reject(new ApiError(502, `Image upload failed: ${error?.message || "unknown error"}`));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function deleteImageByPublicId(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(500, "Image storage is not configured on the server. Contact the administrator.");
  }
  configureCloudinary();
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new ApiError(502, `Image delete failed: ${result.result}`);
  }
}
