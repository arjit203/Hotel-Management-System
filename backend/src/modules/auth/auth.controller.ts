import { Request, Response, NextFunction } from "express";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation";
import * as authService from "./auth.service";
import * as auditService from "../audit/audit.service";
import { clientIp } from "../../middlewares/audit.middleware";

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
/**
 * Sign-in is audited here rather than by `audit.middleware.ts`, for two reasons
 * the middleware cannot work around: it runs on the admin routers, and login is
 * not on one (there is no token yet); and a *failed* login is worth recording
 * precisely because nothing changed — the middleware only logs 2xx responses.
 *
 * Neither branch is allowed to affect the response. `auditService.record`
 * swallows its own errors, and both calls are fire-and-forget.
 */
export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const result = await authService.loginAdmin(parsed.data);

    void auditService.record({
      actorId: String(result.admin.id),
      actorName: result.admin.name,
      actorEmail: result.admin.email,
      actorRole: result.admin.role,
      action: "login",
      module: "auth",
      summary: "Signed in to the admin panel",
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: 200,
      ip: clientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({ success: true, message: "Login successful.", data: result });
  } catch (err) {
    // Deliberately records the *attempted* email. It is the only identifying
    // detail available — the account may not exist — and repeated failures
    // against one address are exactly what this row is for. No password, ever.
    void auditService.record({
      actorId: null,
      actorName: parsed.data.email,
      actorEmail: parsed.data.email,
      actorRole: "unknown",
      action: "login_failed",
      module: "auth",
      summary: "Failed admin sign-in attempt",
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: 401,
      ip: clientIp(req),
      userAgent: req.headers["user-agent"],
    });

    next(err);
  }
}

/**
 * Records a sign-out.
 *
 * The admin panel clears its token locally, so this endpoint exists only to
 * complete the audit trail — "signed in at 09:12, signed out at 18:40" is a
 * question an audit log should be able to answer. It intentionally does not
 * invalidate the JWT: this codebase has no token blocklist, and pretending
 * otherwise would be worse than not offering it.
 */
export async function adminLogout(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.actor;
    if (actor) {
      void auditService.record({
        actorId: actor.id,
        actorName: actor.name || "Unknown admin",
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "logout",
        module: "auth",
        summary: "Signed out of the admin panel",
        method: req.method,
        path: req.originalUrl.split("?")[0],
        statusCode: 200,
        ip: clientIp(req),
        userAgent: req.headers["user-agent"],
      });
    }
    res.status(200).json({ success: true, message: "Signed out." });
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
