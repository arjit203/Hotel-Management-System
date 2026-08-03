import bcrypt from "bcryptjs";
import {
  Admin,
  AdminRole,
  BusinessScope,
  ROLE_IMPLIED_SCOPE,
  effectiveScope,
  isLegacyRole,
} from "./models/admin.model";
import { ApiError } from "../../utils/apiError.util";
import type { CreateAdminInput, UpdateAdminInput, ListAdminsQuery } from "./adminUser.validation";

/**
 * Admin-account management.
 *
 * Every function here assumes the caller has already been proven to be a
 * Super Admin by the route guard — this file enforces the *business* rules that
 * a role check alone cannot express, and those are the interesting part:
 *
 *  • nobody can change their own role          → no accidental self-demotion
 *  • nobody can deactivate or delete themselves → no locking yourself out
 *  • the last active Super Admin is protected   → no locking EVERYONE out
 *
 * That third rule is the one that matters most. Without it, a Super Admin who
 * demotes themselves while being the only one leaves an installation with no
 * account capable of creating another — unrecoverable without database access.
 */

const SALT_ROUNDS = 10;

/** Fields safe to return. `passwordHash` is `select: false` but be explicit. */
const PUBLIC_FIELDS =
  "name email phone role branchId businessScope isActive lastLoginAt createdBy createdAt updatedAt";

/**
 * Derives `businessScope` from the role.
 *
 * Every role's scope is fixed by the role itself, so this is never an input —
 * storing something different would produce a document whose displayed scope
 * contradicts what the route guards actually allow.
 */
function resolveScope(role: AdminRole): BusinessScope[] {
  const implied = ROLE_IMPLIED_SCOPE[role];
  // `undefined` for a role no longer in the enum — see isLegacyRole. Returning
  // an empty scope keeps a legacy row saveable so it can be corrected.
  if (implied === undefined) return [];
  return implied === "all" ? [] : implied;
}

async function countActiveSuperAdmins(excludeId?: string): Promise<number> {
  const query: Record<string, unknown> = { role: "super_admin", isActive: true };
  if (excludeId) query._id = { $ne: excludeId };
  return Admin.countDocuments(query);
}

/**
 * Guards every operation that could remove the last way in.
 * Called before demoting, deactivating or deleting a Super Admin.
 */
async function assertNotLastSuperAdmin(targetId: string, action: string) {
  const target = await Admin.findById(targetId).select("role isActive");
  if (!target || target.role !== "super_admin" || !target.isActive) return;

  const remaining = await countActiveSuperAdmins(targetId);
  if (remaining === 0) {
    throw new ApiError(
      409,
      `This is the only active Super Admin. Promote another account first, then ${action}.`
    );
  }
}

export async function listAdmins(filters: ListAdminsQuery = {}) {
  const query: Record<string, unknown> = {};

  if (filters.role) query.role = filters.role;
  if (filters.isActive) query.isActive = filters.isActive === "true";

  if (filters.search?.trim()) {
    // Escape regex metacharacters so a search for "(" can't break the query.
    const safe = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    query.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const admins = await Admin.find(query).select(PUBLIC_FIELDS).sort({ createdAt: -1 });

  return admins.map((a) => ({
    ...a.toObject(),
    effectiveScope: effectiveScope(a),
    // Surfaced so the admin panel can flag accounts left on a role that no
    // longer exists (`branch_admin`, `staff`). They are refused everywhere by
    // the route guards, so they need reassigning or deleting.
    isLegacyRole: isLegacyRole(a.role),
  }));
}

export async function getAdminById(id: string) {
  const admin = await Admin.findById(id).select(PUBLIC_FIELDS);
  if (!admin) throw new ApiError(404, "Admin account not found.");
  return {
    ...admin.toObject(),
    effectiveScope: effectiveScope(admin),
    isLegacyRole: isLegacyRole(admin.role),
  };
}

export async function createAdmin(input: CreateAdminInput, createdBy: string) {
  const email = input.email.toLowerCase().trim();

  const existing = await Admin.findOne({ email });
  if (existing) {
    throw new ApiError(409, "An admin account with that email already exists.");
  }

  // A branch-scoped role without a branch is meaningless — it would pass every
  // branch check by having nothing to compare against. Only one branch exists
  // today, but the field stays required because `RULES.md` §26 freezes the
  // multi-tenant data model; the admin panel prefills it so nobody types it.
  if (input.role !== "super_admin" && !input.branchId) {
    throw new ApiError(400, "Every role except Super Admin must be assigned a branch.");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const admin = await Admin.create({
    name: input.name.trim(),
    email,
    phone: input.phone || undefined,
    passwordHash,
    role: input.role as AdminRole,
    branchId: input.role === "super_admin" ? null : input.branchId,
    businessScope: resolveScope(input.role as AdminRole),
    isActive: true,
    createdBy,
  });

  return getAdminById(String(admin._id));
}

export async function updateAdmin(id: string, updates: UpdateAdminInput, actingAdminId: string) {
  const admin = await Admin.findById(id);
  if (!admin) throw new ApiError(404, "Admin account not found.");

  const isSelf = String(admin._id) === String(actingAdminId);

  // Changing your own role is the classic way to lock yourself out of the very
  // screen you'd need to undo it.
  if (updates.role && updates.role !== admin.role) {
    if (isSelf) {
      throw new ApiError(
        403,
        "You cannot change your own role. Ask another Super Admin to do it."
      );
    }
    await assertNotLastSuperAdmin(id, "change this role");
  }

  if (updates.email && updates.email.toLowerCase() !== admin.email) {
    const clash = await Admin.findOne({
      email: updates.email.toLowerCase(),
      _id: { $ne: id },
    });
    if (clash) throw new ApiError(409, "Another admin account already uses that email.");
    admin.email = updates.email.toLowerCase().trim();
  }

  if (updates.name !== undefined) admin.name = updates.name.trim();
  if (updates.phone !== undefined) admin.phone = updates.phone || undefined;

  const nextRole = (updates.role as AdminRole) || admin.role;

  if (updates.role) admin.role = nextRole;

  if (updates.branchId !== undefined) {
    admin.branchId = updates.branchId ? (updates.branchId as never) : null;
  }

  // Super Admin is platform-wide by definition; a branch on it would be ignored
  // by every guard, so don't store a value that lies.
  if (nextRole === "super_admin") admin.branchId = null;
  else if (!admin.branchId) {
    throw new ApiError(400, "Every role except Super Admin must be assigned a branch.");
  }

  admin.businessScope = resolveScope(nextRole);

  await admin.save();
  return getAdminById(id);
}

export async function setAdminStatus(id: string, isActive: boolean, actingAdminId: string) {
  const admin = await Admin.findById(id);
  if (!admin) throw new ApiError(404, "Admin account not found.");

  if (String(admin._id) === String(actingAdminId) && !isActive) {
    throw new ApiError(403, "You cannot deactivate your own account.");
  }

  if (!isActive) await assertNotLastSuperAdmin(id, "deactivate it");

  admin.isActive = isActive;
  await admin.save();

  return getAdminById(id);
}

/**
 * Direct password reset by a Super Admin.
 *
 * Separate from the self-service `/auth/admin/forgot-password` flow, which
 * emails a time-limited token. This one is for "the manager forgot their
 * password and needs to be back in within a minute" — the new password is
 * handed over out of band.
 */
export async function resetAdminPasswordDirect(id: string, newPassword: string) {
  const admin = await Admin.findById(id).select("+passwordHash");
  if (!admin) throw new ApiError(404, "Admin account not found.");

  admin.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  // Any outstanding self-service reset link is now stale — clear it so an old
  // email cannot be used to set a third password.
  admin.passwordResetToken = undefined;
  admin.passwordResetExpires = undefined;
  await admin.save();

  return { id, message: "Password updated." };
}

export async function deleteAdmin(id: string, actingAdminId: string) {
  const admin = await Admin.findById(id);
  if (!admin) throw new ApiError(404, "Admin account not found.");

  if (String(admin._id) === String(actingAdminId)) {
    throw new ApiError(403, "You cannot delete your own account.");
  }

  await assertNotLastSuperAdmin(id, "delete it");

  await Admin.findByIdAndDelete(id);
  return { id };
}
