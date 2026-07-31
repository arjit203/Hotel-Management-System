// 7 Vachan - Multer middleware for in-memory image uploads
// Files are held in memory only (never written to local disk) and streamed
// straight to Cloudinary in the controller — see utils/cloudinary.util.ts.
// Shared middleware; reusable by future Hall/Restaurant admin routes.

import multer from "multer";
import { Request } from "express";

const MAX_IMAGE_SIZE_MB = Number(process.env.MAX_IMAGE_UPLOAD_MB || 5);

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, WEBP, or AVIF images are allowed."));
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024 },
  fileFilter,
});
