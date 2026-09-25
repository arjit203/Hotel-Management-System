import { Request, Response, NextFunction } from "express";
import multer from "multer";

interface AppError extends Error {
  statusCode?: number;
  status?: number;
  /** body-parser sets this, e.g. "entity.parse.failed" / "entity.too.large". */
  type?: string;
  /** MongoServerError duplicate key = 11000. */
  code?: number | string;
  /** Mongoose ValidationError: path → ValidatorError. */
  errors?: Record<string, { path?: string; message?: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  // Multer (file upload) errors don't carry a statusCode by default and would
  // otherwise fall through as a generic 500 — normalize to 400 here so the
  // new image-upload routes return a proper client error with a clear message.
  if (err instanceof multer.MulterError || /^Only JPEG, PNG, WEBP/.test(err.message || "")) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // ── Known library errors that are the client's fault, not ours ──
  // Without these they surface as 500s ("Internal server error."), which hides
  // a fixable request problem from the caller and pages whoever reads the logs.

  // body-parser: malformed JSON / body over the express.json() limit.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Malformed JSON body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large." });
  }

  // Mongoose: a non-ObjectId string used as an id (CastError), or the BSON
  // library rejecting one directly.
  if (err.name === "CastError" || err.name === "BSONError") {
    return res.status(400).json({ success: false, message: "Invalid id." });
  }

  // Mongo unique-index violation (e.g. a race past an application-level check).
  if (err.code === 11000) {
    return res
      .status(409)
      .json({ success: false, message: "A record with these details already exists." });
  }

  // Mongoose schema validation. Messages are the schema's own, which are
  // written for users; same `errors: [{ field, message }]` shape as Zod.
  if (err.name === "ValidationError" && err.errors && typeof err.errors === "object") {
    const errors = Object.entries(err.errors).map(([field, e]) => ({
      field: e?.path || field,
      message: e?.message || "Invalid value.",
    }));
    return res.status(400).json({ success: false, message: "Validation failed.", errors });
  }

  const statusCode = err.statusCode || 500;
  // Only a bare 500 is masked. A 502 is always a deliberate ApiError with
  // user-facing copy (e.g. the payment-gateway message in razorpay.util.ts).
  const message = statusCode === 500 ? "Internal server error." : err.message;

  if (statusCode >= 500) {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({ success: false, message });
}
