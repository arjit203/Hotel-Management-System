import { Router } from "express";
import * as auditController from "./audit.controller";
import { authenticate, requireRole } from "../../middlewares/auth.middleware";

/**
 * Audit log routes → mounted at `/api/v1/admin/audit-logs`.
 *
 * Super Admin only, guarded at the **router** level — same pattern as
 * `adminUser.routes.ts`. The log records who changed what across every
 * vertical, including account and settings changes, so a vertical manager
 * reading it would see well outside their own module.
 *
 * There is deliberately no write endpoint. Rows are created by
 * `middlewares/audit.middleware.ts` and by the auth controller, both
 * server-side; an audit trail with a public write route is a suggestion box.
 */
const router = Router();

router.use(authenticate("admin"));
router.use(requireRole("super_admin"));

router.get("/", auditController.listAuditLogs);
router.get("/filters", auditController.getAuditFilters);

export default router;
