import { Request, Response, NextFunction } from "express";
import * as auditService from "./audit.service";
import { listAuditQuerySchema } from "./audit.validation";
import { AUDIT_ACTIONS, AUDIT_MODULES } from "./models/auditLog.model";

/**
 * Audit log read endpoints. Read-only by design — there is no create, update or
 * delete controller here, and adding one would defeat the point of the module.
 */

function handleZodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.errors?.map((e: any) => ({ field: e.path.join("."), message: e.message })),
  });
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listAuditQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const result = await auditService.listAuditLogs(parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** Filter options, so the UI never has to hardcode the enums. */
export async function getAuditFilters(req: Request, res: Response, next: NextFunction) {
  try {
    const actors = await auditService.listAuditActors();
    res.status(200).json({
      success: true,
      data: { modules: AUDIT_MODULES, actions: AUDIT_ACTIONS, actors },
    });
  } catch (err) {
    next(err);
  }
}
