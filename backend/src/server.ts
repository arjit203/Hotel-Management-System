// 7 Vachan - Backend entry point

import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./modules/auth/auth.routes";        // ← NEW
import { errorHandler } from "./middlewares/error.middleware"; // ← NEW

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

// 404 handler                          // ← NEW
app.use((req, res) => {                 // ← NEW
  res.status(404).json({ success: false, message: "Route not found." }); // ← NEW
});                                      // ← NEW

// Centralized error handler — must be registered last.  // ← NEW
app.use(errorHandler);                  // ← NEW

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
  });
}

start();