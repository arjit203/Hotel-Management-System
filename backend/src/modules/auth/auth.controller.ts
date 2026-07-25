import { Request, Response, NextFunction } from "express";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation";
import * as authService from "./auth.service";

function handleZodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.errors?.map((e: any) => ({ field: e.path.join("."), message: e.message })),
  });
}

// ---------- USER ----------
export async function signup(req: Request, res: Response, next: NextFunction) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const result = await authService.signupUser(parsed.data);
    res.status(201).json({
      success: true,
      message: "Account created. Please check your email to verify your account.",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.verifyUserEmail(req.params.token);
    res.status(200).json({ success: true, message: "Email verified successfully." });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const result = await authService.loginUser(parsed.data);
    res.status(200).json({ success: true, message: "Login successful.", data: result });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    await authService.forgotUserPassword(parsed.data.email);
    // Generic message regardless of whether the email exists — prevents user enumeration.
    res.status(200).json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    await authService.resetUserPassword(req.params.token, parsed.data.password);
    res.status(200).json({ success: true, message: "Password has been reset successfully." });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response) {
  res.status(200).json({ success: true, data: (req as any).actor });
}

// ---------- ADMIN ----------
export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const result = await authService.loginAdmin(parsed.data);
    res.status(200).json({ success: true, message: "Login successful.", data: result });
  } catch (err) {
    next(err);
  }
}

export async function adminForgotPassword(req: Request, res: Response, next: NextFunction) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    await authService.forgotAdminPassword(parsed.data.email);
    res.status(200).json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
}

export async function adminResetPassword(req: Request, res: Response, next: NextFunction) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    await authService.resetAdminPassword(req.params.token, parsed.data.password);
    res.status(200).json({ success: true, message: "Password has been reset successfully." });
  } catch (err) {
    next(err);
  }
}
