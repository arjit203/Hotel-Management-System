import { Schema, model, Document, Types } from "mongoose";

/**
 * Admin roles.
 *
 * One owner per vertical, plus a Super Admin over all of them. Enforcement
 * lives in each module's `requireRole(...)` list, never in the UI.
 *
 * ── Why `branch_admin` and `staff` were removed (owner's decision) ──
 * `branch_admin` existed to scope someone to one branch, but 7 Vachan will only
 * ever run a single branch, so it was a second Super Admin under another name.
 * `staff` was a read-only tier nobody needed — a manager reads everything in
 * their own vertical anyway.
 *
 * Note this removes the ROLES, not the multi-tenant DATA MODEL: `branchId`
 * stays on every property and on this document, because `RULES.md` §26 freezes
 * that requirement. Adding a second branch later means reintroducing a role,
 * not migrating data.
 */
export type AdminRole =
  | "super_admin"
  | "hotel_manager"
  | "restaurant_manager"
  | "hall_manager";

export const ADMIN_ROLES: AdminRole[] = [
  "super_admin",
  "hotel_manager",
  "restaurant_manager",
  "hall_manager",
];

/** The verticals an account may be scoped to. */
export type BusinessScope = "hotel" | "restaurant" | "hall";

export const BUSINESS_SCOPES: BusinessScope[] = ["hotel", "restaurant", "hall"];

/**
 * Which verticals each role covers.
 *
 * Scope is derived entirely from the role now — there is no role whose scope is
 * assigned separately, so `businessScope` on the document is a stored *copy* of
 * this for display, never an independent input. Keeping it derived means the
 * column an admin reads can never contradict what the route guards enforce.
 */
export const ROLE_IMPLIED_SCOPE: Record<AdminRole, BusinessScope[] | "all"> = {
  super_admin: "all",
  hotel_manager: ["hotel"],
  restaurant_manager: ["restaurant"],
  hall_manager: ["hall"],
};

export interface IAdmin extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: AdminRole;
  branchId?: Types.ObjectId | null; // null = Super Admin (platform-wide)
  /**
   * Verticals this account may work in — derived from the role and stored so
   * the admin list can show one consistent column. Never an independent input.
   */
  businessScope: BusinessScope[];
  isActive: boolean;
  lastLoginAt?: Date;
  /** Who created this account. Null for the seeded first Super Admin. */
  createdBy?: Types.ObjectId | null;
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
      enum: ADMIN_ROLES,
      required: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    businessScope: {
      type: [String],
      enum: BUSINESS_SCOPES,
      default: [],
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export const Admin = model<IAdmin>("Admin", adminSchema);

/** True for a role that is no longer offered (e.g. a pre-existing `staff` row). */
export function isLegacyRole(role: string): boolean {
  return !ADMIN_ROLES.includes(role as AdminRole);
}

/**
 * Resolves the verticals an account covers, for display.
 *
 * Deliberately tolerant of roles that are no longer in `ADMIN_ROLES`. Removing
 * `branch_admin` and `staff` from the enum does not remove them from documents
 * already in the database, and an unguarded `ROLE_IMPLIED_SCOPE[role]` on such
 * a row returns `undefined` — then `.length` throws and takes the entire admin
 * list endpoint down with a 500. One stale document should never cost you the
 * screen you'd use to fix it.
 *
 * A legacy account resolves to no scope, which is also the safe answer: every
 * `requireRole` list names the current roles explicitly, so it is already
 * refused everywhere.
 */
export function effectiveScope(admin: Pick<IAdmin, "role" | "businessScope">): BusinessScope[] {
  const implied = ROLE_IMPLIED_SCOPE[admin.role];
  if (implied === undefined) return [];
  if (implied === "all") return [...BUSINESS_SCOPES];
  if (implied.length > 0) return implied;
  return admin.businessScope ?? [];
}
