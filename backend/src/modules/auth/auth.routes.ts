import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Stricter rate limit for sensitive auth actions (login, forgot-password) to
// reduce brute-force / abuse risk, per AI_INSTRUCTIONS.md security rules.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

// ---------- USER ROUTES ----------
router.post("/user/signup", authLimiter, authController.signup);
router.get("/user/verify-email/:token", authController.verifyEmail);
router.post("/user/login", authLimiter, authController.login);
router.post("/user/forgot-password", authLimiter, authController.forgotPassword);
router.post("/user/reset-password/:token", authLimiter, authController.resetPassword);
router.get("/user/me", authenticate("user"), authController.me);

// ---------- ADMIN ROUTES ----------
// No public admin signup route — admins are provisioned internally (see auth.service.ts).
router.post("/admin/login", authLimiter, authController.adminLogin);
router.post("/admin/forgot-password", authLimiter, authController.adminForgotPassword);
router.post("/admin/reset-password/:token", authLimiter, authController.adminResetPassword);
router.get("/admin/me", authenticate("admin"), authController.me);

// Sign-out exists to close the audit trail, not to invalidate the token —
// there is no blocklist here, and the panel clears its own storage.
router.post("/admin/logout", authenticate("admin"), authController.adminLogout);

export default router;
