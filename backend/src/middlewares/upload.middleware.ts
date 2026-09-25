// 7 Vachan - Multer middleware for in-memory image uploads
// Files are held in memory only (never written to local disk) and streamed
// straight to Cloudinary in the controller — see utils/cloudinary.util.ts.
// Shared middleware; reusable by future Hall/Restaurant admin routes.

import multer from "multer";
import { Request, RequestHandler } from "express";

// SVG is deliberately absent: it is XML that can carry script, and Cloudinary
// would serve it back from our own delivery URL.
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

// Checked alongside the mimetype, which is client-declared and trivially set.
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif)$/i;

// Error text must keep the "Only JPEG, PNG, WEBP" prefix — error.middleware.ts
// matches on it to return a 400 instead of a 500.
const FILE_TYPE_MESSAGE = "Only JPEG, PNG, WEBP, or AVIF images are allowed.";

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.test(file.originalname || "")) {
    return cb(new Error(FILE_TYPE_MESSAGE));
  }
  cb(null, true);
}

/**
 * The size limit is read per request, not at import: this file is imported (via
 * the route files) before server.ts calls dotenv.config(), so a module-level
 * read would never see MAX_IMAGE_UPLOAD_MB from .env.
 */
function buildMulter() {
  const maxMb = Number(process.env.MAX_IMAGE_UPLOAD_MB) || 5;
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1, fields: 10 },
    fileFilter,
  });
}

/** Same call shape as a multer instance: `uploadImage.single("image")`. */
export const uploadImage = {
  single(fieldName: string): RequestHandler {
    return (req, res, next) => buildMulter().single(fieldName)(req, res, next);
  },
};
