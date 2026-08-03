import { z } from "zod";

/**
 * Query validation for the admin console's cross-cutting features: the activity
 * timeline, the notification centre, global search and exports.
 *
 * Same conventions as everywhere else — parse in the controller, uniform 400
 * with per-field errors, never validate in a service.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional();

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  module: z.enum(["hotel", "restaurant", "hall"]).optional(),
});

export const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unreadOnly: z.enum(["true", "false"]).optional(),
});

export const markReadSchema = z.object({
  // Matches `ActivityItem.key`: `<type>:<24-hex id>`.
  notificationKey: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z_]+:[a-f\d]{24}$/i, "Not a valid notification key"),
});

export const searchQuerySchema = z.object({
  q: z.string().min(2, "Type at least two characters").max(80),
});

export const exportQuerySchema = z
  .object({
    dataset: z.enum(["bookings", "customers", "reviews", "reservations", "enquiries", "revenue"]),
    format: z.enum(["csv", "xlsx", "pdf"]),
    from: isoDate,
    to: isoDate,
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "The start date must not be after the end date.",
    path: ["from"],
  });

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
