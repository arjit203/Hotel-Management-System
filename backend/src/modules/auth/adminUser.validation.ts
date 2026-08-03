import { z } from "zod";
import { ADMIN_ROLES, BUSINESS_SCOPES } from "./models/admin.model";

/**
 * Zod schemas for admin-account management.
 *
 * Same conventions as every other module: parse in the controller, return a
 * uniform 400 with per-field errors, never validate in the service.
 */

/**
 * Password floor. Matches nothing else in the codebase only because nothing
 * else sets one — admin accounts are the highest-value credential here, so
 * eight characters is the minimum worth accepting.
 */
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

const role = z.enum(ADMIN_ROLES as [string, ...string[]]);

/**
 * Accepted but ignored.
 *
 * Every role's business scope is now fixed by the role itself, so the server
 * derives it (`resolveScope`) rather than trusting the client. The field stays
 * in the schema so an older admin panel build that still sends it gets a clean
 * response instead of a validation error.
 */
const businessScope = z.array(z.enum(BUSINESS_SCOPES as [string, ...string[]])).max(3);

export const createAdminSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional().or(z.literal("")),
  password,
  role,
  /** Required for every role except super_admin, which is platform-wide. */
  branchId: z.string().min(1).optional().or(z.literal("")),
  businessScope: businessScope.optional(),
});

/**
 * Editing deliberately excludes `password` — resetting a password is its own
 * endpoint so it can't happen as a side effect of a name change, and so the
 * action is separately auditable.
 */
export const updateAdminSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional().or(z.literal("")),
  role: role.optional(),
  branchId: z.string().optional().or(z.literal("")).or(z.null()),
  businessScope: businessScope.optional(),
});

export const setAdminStatusSchema = z.object({
  isActive: z.boolean(),
});

export const resetAdminPasswordSchema = z.object({
  password,
});

/** List filters. Everything optional so the same route serves the unfiltered list. */
export const listAdminsQuerySchema = z.object({
  role: role.optional(),
  isActive: z.enum(["true", "false"]).optional(),
  search: z.string().max(100).optional(),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;
