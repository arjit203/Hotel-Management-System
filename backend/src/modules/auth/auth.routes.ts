import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Stricter rate limit for sensitive auth actions (login, forgot-password) to
// reduce brute-force / abuse risk, per AI_INSTRUCTIONS.md security rules.
//
// Two limiters with separate counters (same numbers): with one shared bucket,
// a burst of guest sign-in/sign-up attempts from a shared IP (hotel Wi-Fi, the
// front-desk NAT) could 429 the staff out of the admin panel, and vice versa.
function makeAuthLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please try again later." },
  });
}
const userAuthLimiter = makeAuthLimiter();
const adminAuthLimiter = makeAuthLimiter();

// ---------- USER ROUTES ----------
router.post("/user/signup", userAuthLimiter, authController.signup);
router.get("/user/verify-email/:token", authController.verifyEmail);
router.post("/user/login", userAuthLimiter, authController.login);
router.post("/user/forgot-password", userAuthLimiter, authController.forgotPassword);
router.post("/user/reset-password/:token", userAuthLimiter, authController.resetPassword);
router.get("/user/me", authenticate("user"), authController.me);

// ---------- ADMIN ROUTES ----------
// No public admin signup route — admins are provisioned internally (see auth.service.ts).
router.post("/admin/login", adminAuthLimiter, authController.adminLogin);
router.post("/admin/forgot-password", adminAuthLimiter, authController.adminForgotPassword);
router.post("/admin/reset-password/:token", adminAuthLimiter, authController.adminResetPassword);
router.get("/admin/me", authenticate("admin"), authController.me);

// Sign-out exists to close the audit trail, not to invalidate the token —
// there is no blocklist here, and the panel clears its own storage.
router.post("/admin/logout", authenticate("admin"), authController.adminLogout);

export default router;
