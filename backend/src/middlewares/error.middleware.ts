import { Request, Response, NextFunction } from "express";
import multer from "multer";

interface AppError extends Error {
  statusCode?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  // Multer (file upload) errors don't carry a statusCode by default and would
  // otherwise fall through as a generic 500 — normalize to 400 here so the
  // new image-upload routes return a proper client error with a clear message.
  if (err instanceof multer.MulterError || /^Only JPEG, PNG, WEBP/.test(err.message || "")) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error." : err.message;

  if (statusCode === 500) {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({ success: false, message });
}
