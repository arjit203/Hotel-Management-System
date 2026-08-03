import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_MODULES } from "./models/auditLog.model";

/**
 * Query validation for the audit list.
 *
 * Everything is optional so the same route serves the unfiltered view. Dates
 * are accepted as plain `YYYY-MM-DD` because that is what an `<input type=date>`
 * submits; the service widens them to cover the whole day at both ends.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional();

export const listAuditQuerySchema = z
  .object({
    module: z.enum(AUDIT_MODULES as unknown as [string, ...string[]]).optional(),
    action: z.enum(AUDIT_ACTIONS as unknown as [string, ...string[]]).optional(),
    actorId: z.string().regex(/^[a-f\d]{24}$/i, "Not a valid id").optional(),
    search: z.string().max(120).optional(),
    from: isoDate,
    to: isoDate,
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "The start date must not be after the end date.",
    path: ["from"],
  });

export type ListAuditQueryInput = z.infer<typeof listAuditQuerySchema>;
