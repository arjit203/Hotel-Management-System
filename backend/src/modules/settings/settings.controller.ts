import { Request, Response, NextFunction } from "express";
import * as settingsService from "./settings.service";
import type { SettingCategory } from "./models/setting.model";
import { settingsCategoryParamSchema, updateSettingsSchema } from "./settings.validation";

/**
 * Settings controllers. Same shape as every other module: parse with Zod,
 * delegate to the service, `next(err)` to the central error handler, respond
 * with the `{ success, data }` envelope.
 */

function handleZodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.errors?.map((e: any) => ({ field: e.path.join("."), message: e.message })),
  });
}

// ================== PUBLIC ==================

/**
 * Everything the website is allowed to know.
 *
 * One request rather than one per category: the public site reads settings in
 * a root layout and passes them down, so splitting this would add round trips
 * to every page render for no benefit.
 */
export async function getPublicSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.getPublicSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN (Super Admin only) ==================

export async function getAllSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.getAllCategories();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function getSettingsCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = settingsCategoryParamSchema.safeParse(req.params);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const data = await settingsService.getCategory(parsed.data.category as SettingCategory);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateSettingsCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const params = settingsCategoryParamSchema.safeParse(req.params);
    if (!params.success) return handleZodError(res, params.error);

    const body = updateSettingsSchema.safeParse(req.body);
    if (!body.success) return handleZodError(res, body.error);

    const data = await settingsService.updateCategory(
      params.data.category as SettingCategory,
      body.data as Record<string, unknown>,
      req.actor?.id
    );

    res.status(200).json({ success: true, message: "Settings saved.", data });
  } catch (err) {
    next(err);
  }
}

export async function resetSettingsCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = settingsCategoryParamSchema.safeParse(req.params);
    if (!parsed.success) return handleZodError(res, parsed.error);

    const values = await settingsService.resetCategory(parsed.data.category as SettingCategory);
    res.status(200).json({ success: true, message: "Settings reset to defaults.", data: { values } });
  } catch (err) {
    next(err);
  }
}
