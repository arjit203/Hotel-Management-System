import { Router } from "express";
import * as settingsController from "./settings.controller";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";
import { auditLogger } from "../../middlewares/audit.middleware";
import { uploadImage } from "../../middlewares/upload.middleware";
import * as mediaController from "./settings.media.controller";

/**
 * Settings routes.
 *
 * Two routers, and the split is the security boundary:
 *   publicSettingsRouter → GET /api/v1/settings          (no token, curated)
 *   adminSettingsRouter  → /api/v1/admin/settings        (Super Admin only)
 *
 * The admin router guards at the **router** level, the same pattern as
 * `adminUser.routes.ts` and for the same reason: adding a route to this file
 * can never accidentally ship without the guard. Settings hold gateway
 * credentials and the maintenance-mode switch, so "only Super Admin" is not a
 * UI preference — a vertical manager with a valid token gets a 403 here.
 */

// ============================================================
// PUBLIC  →  mounted at /api/v1/settings
// ============================================================
export const publicSettingsRouter = Router();

publicSettingsRouter.get("/", settingsController.getPublicSettings);

// ============================================================
// ADMIN  →  mounted at /api/v1/admin/settings
// ============================================================
export const adminSettingsRouter = Router();

adminSettingsRouter.use(authenticate("admin"));
adminSettingsRouter.use(requireRole("super_admin"));
// Records every mutation on this router — create, update, delete, status and
// role changes, uploads — without a single controller or service knowing it
// exists. Hooks res.on("finish"), so it runs after the response is sent and can
// neither slow a request down nor fail one. Must come after authenticate(),
// because it reads req.actor. See middlewares/audit.middleware.ts.
adminSettingsRouter.use(auditLogger());

adminSettingsRouter.get("/", settingsController.getAllSettings);

// Branding assets (logo, favicon, hero) go to Cloudinary through the shared
// memory-storage multer instance, exactly like every other upload in the
// codebase. Declared before `/:category` so the literal path is not swallowed.
adminSettingsRouter.post("/upload-image", uploadImage.single("image"), mediaController.uploadSettingsImage);

adminSettingsRouter.get("/:category", settingsController.getSettingsCategory);
adminSettingsRouter.put("/:category", settingsController.updateSettingsCategory);
adminSettingsRouter.delete("/:category", settingsController.resetSettingsCategory);
