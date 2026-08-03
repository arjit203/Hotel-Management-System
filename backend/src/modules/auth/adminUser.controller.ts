import { Request, Response, NextFunction } from "express";
import * as adminUserService from "./adminUser.service";
import {
  createAdminSchema,
  updateAdminSchema,
  setAdminStatusSchema,
  resetAdminPasswordSchema,
  listAdminsQuerySchema,
} from "./adminUser.validation";

/**
 * Admin-account management controllers.
 *
 * Same shape as every other controller here: parse with Zod, delegate to the
 * service, `next(err)` to the central error handler, return `{ success, data }`.
 *
 * Authorisation is entirely the route guard's job (`requireRole("super_admin")`)
 * plus the business rules inside the service. Nothing is decided here.
 */

function handleZodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.errors?.map((e: any) => ({ field: e.path.join("."), message: e.message })),
  });
}

export async function listAdmins(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listAdminsQuerySchema.safeParse(req.query);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const admins = await adminUserService.listAdmins(parsed.data);
    res.status(200).json({ success: true, data: admins });
  } catch (err) {
    next(err);
  }
}

export async function getAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await adminUserService.getAdminById(req.params.adminId);
    res.status(200).json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
}

export async function createAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const admin = await adminUserService.createAdmin(parsed.data, req.actor!.id);
    res.status(201).json({ success: true, message: "Admin account created.", data: admin });
  } catch (err) {
    next(err);
  }
}

export async function updateAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateAdminSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const admin = await adminUserService.updateAdmin(
      req.params.adminId,
      parsed.data,
      req.actor!.id
    );
    res.status(200).json({ success: true, message: "Admin account updated.", data: admin });
  } catch (err) {
    next(err);
  }
}

export async function setAdminStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = setAdminStatusSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const admin = await adminUserService.setAdminStatus(
      req.params.adminId,
      parsed.data.isActive,
      req.actor!.id
    );

    res.status(200).json({
      success: true,
      message: parsed.data.isActive
        ? "Account activated. They can sign in again immediately."
        : "Account deactivated. Any signed-in session stops working on their next request.",
      data: admin,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetAdminPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = resetAdminPasswordSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const result = await adminUserService.resetAdminPasswordDirect(
      req.params.adminId,
      parsed.data.password
    );

    res.status(200).json({
      success: true,
      message: "Password reset. Share it with them directly — it is not emailed.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminUserService.deleteAdmin(req.params.adminId, req.actor!.id);
    res.status(200).json({ success: true, message: "Admin account deleted.", data: result });
  } catch (err) {
    next(err);
  }
}
