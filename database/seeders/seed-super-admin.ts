// One-time seed script: creates a Super Admin account.
// Run from the backend/ folder (so it resolves mongoose/bcryptjs from there):
//   cd backend && npx ts-node ../database/seeders/seed-super-admin.ts
//
// NOTE: This script defines its own minimal Admin schema matching
// backend/src/modules/auth/models/admin.model.ts, rather than importing it
// across the package boundary — avoids module-resolution fragility for a
// simple one-time utility script. If the Admin schema changes, keep this in
// sync (it only needs the fields used at signup time).

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../backend/.env") });

import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    role: { type: String, enum: ["super_admin", "hotel_manager", "restaurant_manager", "hall_manager"] },
    branchId: { type: Schema.Types.ObjectId, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

async function seedSuperAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@7vachan.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vachan_dev";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log(`Admin with email ${email} already exists. Skipping.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await Admin.create({
    name,
    email,
    passwordHash,
    role: "super_admin",
    branchId: null,
    isActive: true,
  });

  console.log("✅ Super Admin created:");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log("   ⚠️  Change this password after first login (once a change-password flow exists).");

  await mongoose.disconnect();
}

seedSuperAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
