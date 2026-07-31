// 7 Vachan - Cloudinary configuration (media storage)
// Shared config, used by utils/cloudinary.util.ts. Reusable by future
// Hall/Restaurant modules — do not duplicate this setup per vertical.
//
// IMPORTANT: config/db.ts reads MONGODB_URI lazily inside connectDB(), not at
// module-load time, because server.ts calls dotenv.config() AFTER its own
// import statements run (imports always execute before later statements in
// the same file). This file follows that same lazy pattern — env vars are
// read only when configureCloudinary()/isCloudinaryConfigured() are actually
// called (i.e. during a real upload request, well after dotenv has loaded),
// never at import time.

import { v2 as cloudinary } from "cloudinary";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

// Idempotent — safe to call on every upload/delete; cost is negligible
// (just sets a few fields on the SDK's in-memory config object).
export function configureCloudinary(): void {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };
