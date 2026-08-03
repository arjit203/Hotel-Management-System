// 7 Vachan - Backend entry point

import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./modules/auth/auth.routes";        // ← NEW
import adminUserRoutes from "./modules/auth/adminUser.routes";
import { errorHandler } from "./middlewares/error.middleware"; // ← NEW
import {
  publicHotelRouter,
  publicBookingRouter,
  adminHotelRouter,
} from "./modules/hotel/hotel.routes";
import {
  publicRestaurantRouter,
  publicReservationRouter,
  adminRestaurantRouter,
} from "./modules/restaurant/restaurant.routes";
import {
  publicHallRouter,
  publicEnquiryRouter,
  adminHallRouter,
} from "./modules/hall/hall.routes";
import {
  publicSettingsRouter,
  adminSettingsRouter,
} from "./modules/settings/settings.routes";
import auditRoutes from "./modules/audit/audit.routes";
import consoleRoutes from "./modules/console/console.routes";
import { applyIntegrationEnv } from "./modules/settings/settings.service";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "7vachan-backend", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth", authRoutes);   // ← NEW

// Admin-account management. Super Admin only, enforced on the router itself.
app.use("/api/v1/admin/users", adminUserRoutes);
app.use("/api/v1/hotels", publicHotelRouter);
app.use("/api/v1/hotel-bookings", publicBookingRouter);
app.use("/api/v1/admin/hotels", adminHotelRouter);

// Restaurant module (Phase 4.0) — additive. The Hotel mounts above are unchanged,
// and these namespaces don't overlap them, so no existing route behaviour shifts.
app.use("/api/v1/restaurants", publicRestaurantRouter);
app.use("/api/v1/table-reservations", publicReservationRouter);
app.use("/api/v1/admin/restaurants", adminRestaurantRouter);

// Marriage Hall module (Phase 4) — additive. The Hotel and Restaurant mounts
// above are unchanged and these namespaces don't overlap them, so no existing
// route behaviour shifts.
app.use("/api/v1/halls", publicHallRouter);
app.use("/api/v1/hall-enquiries", publicEnquiryRouter);
app.use("/api/v1/admin/halls", adminHallRouter);

// Platform settings (Phase 5) — the public router is read-only and serves only
// the categories listed in PUBLIC_SETTING_CATEGORIES; the admin one is Super
// Admin only, guarded on the router itself.
app.use("/api/v1/settings", publicSettingsRouter);
app.use("/api/v1/admin/settings", adminSettingsRouter);

// Audit log (read-only, Super Admin). Rows are written by audit.middleware.ts,
// which is mounted on each admin router above — see modules/audit/audit.routes.ts.
app.use("/api/v1/admin/audit-logs", auditRoutes);

// Admin console cross-cutting features: activity timeline, notification centre,
// global search and exports. Scoped per role inside the services rather than
// gated by requireRole — every role needs a dashboard, just a different one.
app.use("/api/v1/admin/console", consoleRoutes);

// 404 handler                        // ← NEW
app.use((req, res) => {                 // ← NEW
  res.status(404).json({ success: false, message: "Route not found." }); // ← NEW
});                                      // ← NEW

// Centralized error handler — must be registered last.  // ← NEW
app.use(errorHandler);                  // ← NEW

async function start() {
  await connectDB();

  /**
   * Integration credentials saved through Settings are copied into
   * `process.env` here, before the first request.
   *
   * `razorpay.util.ts`, `config/cloudinary.ts` and `email.util.ts` all read
   * `process.env` at call time rather than import time (each documents why), so
   * this one call is what makes the Settings page reach them without any of
   * those files changing. Blank values are skipped, leaving `.env` as the
   * fallback.
   *
   * Non-fatal: a settings read failure must not stop the API from booting, or a
   * bad row would take the whole platform down instead of one page.
   */
  try {
    await applyIntegrationEnv();
  } catch (err) {
    console.error("Could not apply integration settings from the database:", err);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
  });
}

start();
