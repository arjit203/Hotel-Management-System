import { Router } from "express";
import * as consoleController from "./console.controller";
import { authenticate } from "../../middlewares/auth.middleware";

/**
 * Admin console routes → mounted at `/api/v1/admin/console`.
 *
 * ── Why there is no `requireRole` here ──
 * Every other admin router names the roles it accepts. This one deliberately
 * does not, because these four features are *scoped* rather than *restricted*:
 * a hall manager should have a dashboard, a bell and a search box — they should
 * just contain hall data and nothing else.
 *
 * That scoping is enforced in the services, not the router, via
 * `scopeForAdmin()` reading the same `effectiveScope` the route guards use. A
 * role check at this level would either lock managers out of their own
 * dashboard or let them see the whole estate; per-request scoping is the only
 * thing that gives the right answer for all four roles.
 *
 * The exception is exports, where `assertAllowed()` throws a 403 for a dataset
 * outside the caller's scope — an export is a file leaving the building, so
 * "narrow it silently" is the wrong default there.
 */
const router = Router();

router.use(authenticate("admin"));

// -- Dashboard activity timeline --
router.get("/activity", consoleController.getActivity);

// -- Notification centre --
router.get("/notifications", consoleController.listNotifications);
router.get("/notifications/count", consoleController.getUnreadCount);
router.put("/notifications/read", consoleController.markNotificationRead);
router.put("/notifications/unread", consoleController.markNotificationUnread);
router.put("/notifications/read-all", consoleController.markAllNotificationsRead);

// -- Global search --
router.get("/search", consoleController.globalSearch);

// -- Exports & reports --
router.get("/exports", consoleController.listExports);
router.get("/exports/:dataset/:format", consoleController.downloadExport);

export default router;
