import { Schema, model, Document, Types } from "mongoose";

export type AdminRole = "super_admin" | "branch_admin" | "staff";

export interface IAdmin extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: AdminRole;
  branchId?: Types.ObjectId | null; // null = Super Admin (platform-wide)
  isActive: boolean;
  lastLoginAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["super_admin", "branch_admin", "staff"],
      required: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export const Admin = model<IAdmin>("Admin", adminSchema);
