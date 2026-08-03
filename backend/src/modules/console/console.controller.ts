import { Request, Response, NextFunction } from "express";
import * as activityService from "./activity.service";
import * as notificationService from "./notification.service";
import * as searchService from "./search.service";
import * as exportService from "./export.service";
import * as auditService from "../audit/audit.service";
import { renderCsv, renderXlsx, renderPdf, contentTypeFor, describeRange } from "./export.format";
import { clientIp } from "../../middlewares/audit.middleware";
import { Admin } from "../auth/models/admin.model";
import { ApiError } from "../../utils/apiError.util";
import {
  activityQuerySchema,
  notificationsQuerySchema,
  markReadSchema,
  searchQuerySchema,
  exportQuerySchema,
} from "./console.validation";

/**
 * Admin console controllers — dashboard timeline, notification centre, global
 * search and exports.
 *
 * Everything here is scoped to `req.actor.id`. There is no "look at someone
 * else's notifications" parameter and no way to widen the search beyond the
 * caller's own role, so the RBAC surface is the token itself.
 */

function handleZodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.errors?.map((e: any) => ({ field: e.path.join("."), message: e.message })),
  });
}

function requireActorId(req: Request): string {
  const id = req.actor?.id;
  if (!id) throw new ApiError(401, "Not authenticated.");
  return id;
}

// ================== ACTIVITY TIMELINE ==================

export async function getActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = activityQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const adminId = requireActorId(req);
    const admin = await Admin.findById(adminId).select("role businessScope");
    if (!admin) throw new ApiError(401, "This account no longer exists.");

    // The admin's own scope is the ceiling; `?module=` can narrow it further
    // but never widen it.
    const allowed = activityService.scopeForAdmin(admin);
    const requested = parsed.data.module;
    const modules = requested
      ? allowed.filter((m) => m === requested)
      : allowed;

    const days = parsed.data.days ?? 30;
    const items = await activityService.collectActivity({
      modules,
      limit: parsed.data.limit ?? 25,
      since: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    });

    res.status(200).json({ success: true, data: { items, scope: allowed } });
  } catch (err) {
    next(err);
  }
}

// ================== NOTIFICATIONS ==================

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = notificationsQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const data = await notificationService.listNotifications(requireActorId(req), {
      limit: parsed.data.limit,
      unreadOnly: parsed.data.unreadOnly === "true",
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.unreadCount(requireActorId(req));
    res.status(200).json({ success: true, data: { unreadCount: count } });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = markReadSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    await notificationService.markRead(requireActorId(req), parsed.data.notificationKey);
    res.status(200).json({ success: true, message: "Marked as read." });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationUnread(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = markReadSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    await notificationService.markUnread(requireActorId(req), parsed.data.notificationKey);
    res.status(200).json({ success: true, message: "Marked as unread." });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markAllRead(requireActorId(req));
    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    next(err);
  }
}

// ================== GLOBAL SEARCH ==================

export async function globalSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const data = await searchService.globalSearch(requireActorId(req), parsed.data.q);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ================== EXPORTS ==================

/** The catalogue, so the Reports page renders from the server's definitions. */
export async function listExports(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = requireActorId(req);
    const admin = await Admin.findById(adminId).select("role businessScope");
    if (!admin) throw new ApiError(401, "This account no longer exists.");

    const scope = activityService.scopeForAdmin(admin);
    const isSuperAdmin = admin.role === "super_admin";

    const datasets = Object.values(exportService.DATASETS).map((d) => ({
      key: d.key,
      label: d.label,
      description: d.description,
      formats: d.formats,
      module: d.module,
      // Reported rather than filtered out, so the page can show what exists and
      // grey out what this role cannot take — a manager wondering where the
      // revenue report went is a worse experience than being told.
      allowed: d.module === null ? isSuperAdmin : scope.includes(d.module),
    }));

    res.status(200).json({ success: true, data: { datasets } });
  } catch (err) {
    next(err);
  }
}

export async function downloadExport(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = exportQuerySchema.safeParse({ ...req.params, ...req.query });
    if (!parsed.success) return handleZodError(res, parsed.error);

    const adminId = requireActorId(req);
    const { dataset, format, from, to } = parsed.data;

    await exportService.assertAllowed(adminId, dataset);

    const definition = exportService.DATASETS[dataset];
    if (!definition.formats.includes(format)) {
      throw new ApiError(
        400,
        `${definition.label} cannot be exported as ${format.toUpperCase()}. Available: ${definition.formats
          .join(", ")
          .toUpperCase()}.`
      );
    }

    const rows = await exportService.collectRows({ dataset, format, from, to });
    const generatedBy = req.actor?.name || req.actor?.email || "admin";
    const input = { definition, rows, from, to, generatedBy };

    const body =
      format === "csv"
        ? renderCsv(input)
        : format === "xlsx"
          ? await renderXlsx(input)
          : await renderPdf(input);

    // Exports leave the building with guest names, emails and phone numbers in
    // them, so who took what — and for which window — is worth recording.
    void auditService.record({
      actorId: adminId,
      actorName: req.actor?.name || "Unknown admin",
      actorEmail: req.actor?.email,
      actorRole: req.actor?.role || "unknown",
      action: "export",
      module: "reports",
      entity: dataset,
      summary: `Exported ${definition.label} as ${format.toUpperCase()} (${describeRange(from, to)}, ${rows.length} rows)`,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: 200,
      ip: clientIp(req),
      userAgent: req.headers["user-agent"],
      meta: { rows: rows.length, from: from ?? null, to: to ?? null },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", contentTypeFor(format));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="7vachan-${dataset}-${stamp}.${format}"`
    );
    res.setHeader("Content-Length", String(body.length));
    res.status(200).send(body);
  } catch (err) {
    next(err);
  }
}
