import { Router } from "express";
import * as adminUserController from "./adminUser.controller";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";

/**
 * Admin-account management → mounted at `/api/v1/admin/users`.
 *
 * ── Super Admin only, and enforced here ──
 * `RULES.md` and the brief both say only a Super Admin may create, edit or
 * delete admin accounts. That is enforced by the two middlewares below on the
 * whole router, not per-route and not in the UI — a manager who calls these
 * endpoints directly with a valid token gets a 403 regardless of what the admin
 * panel chooses to render.
 *
 * The router-level `requireRole` is deliberate: adding a route to this file can
 * never accidentally ship without the guard.
 *
 * Note that `authenticate("admin")` re-reads the account from the database on
 * every request, so a role change or deactivation made here takes effect on the
 * target's very next call — no waiting for their JWT to expire.
 */
const router = Router();

router.use(authenticate("admin"));
router.use(requireRole("super_admin"));

router.get("/", adminUserController.listAdmins);
router.post("/", adminUserController.createAdmin);

router.get("/:adminId", adminUserController.getAdmin);
router.put("/:adminId", adminUserController.updateAdmin);
router.delete("/:adminId", adminUserController.deleteAdmin);

// Deactivation is the recommended way to remove access — it preserves the
// account and its `lastLoginAt` history, where a delete does not.
router.put("/:adminId/status", adminUserController.setAdminStatus);

// Separate from the edit route so a password can never be changed as a side
// effect of renaming someone, and so the action stands alone in any audit.
router.put("/:adminId/password", adminUserController.resetAdminPassword);

export default router;
