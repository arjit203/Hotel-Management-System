// 7 Vachan - Backend entry point
// SETUP STUB ONLY — health-check route only, no business modules yet.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./config/db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "7vachan-backend", timestamp: new Date().toISOString() });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Backend running at http://localhost:${PORT}`);
  });
}

start();
