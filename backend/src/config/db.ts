// 7 Vachan - MongoDB connection setup (Mongoose)
// SETUP STUB ONLY — no models/business logic yet, per project rules.

import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vachan_dev";

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    console.error("   Backend will keep running, but DB-dependent routes will fail.");
    console.error("   Make sure MongoDB is running and MONGODB_URI is set correctly in backend/.env");
  }
}

export default connectDB;
