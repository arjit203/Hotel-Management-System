import { Schema, model, Document, Types } from "mongoose";

/**
 * A record of one administrative action.
 *
 * ── Append-only by convention ──
 * Nothing in the codebase updates or deletes an audit row, and no endpoint
 * exposes a way to. An audit trail an admin can edit is not an audit trail. If
 * retention becomes a problem, add a TTL index — do not add a delete route.
 *
 * ── Why the fields are denormalised ──
 * `actorName` and `actorRole` are copied in rather than populated from the
 * Admin collection. A log entry has to stay readable after the account is
 * deleted or its role changed; "who did this, and what were they at the time"
 * is the question an audit answers, and a join would answer a different one.
 */

export const AUDIT_ACTIONS = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "login_failed",
  "role_change",
  "status_change",
  "password_reset",
  "upload",
  "export",
  "settings_change",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_MODULES = [
  "hotel",
  "restaurant",
  "hall",
  "auth",
  "users",
  "settings",
  "content",
  "reports",
  "other",
] as const;

export type AuditModule = (typeof AUDIT_MODULES)[number];

export interface IAuditLog extends Document {
  actorId?: Types.ObjectId | null;
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  action: AuditAction;
  module: AuditModule;
  /** The kind of thing acted on: "room", "booking", "offer", "menu-item"… */
  entity?: string;
  entityId?: string;
  /** One human sentence, e.g. "Updated room Deluxe Suite". */
  summary: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  /** Small, redacted snapshot of the request body. Never holds credentials. */
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "Admin", default: null, index: true },
    actorName: { type: String, required: true },
    actorEmail: { type: String },
    actorRole: { type: String, required: true, index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    module: { type: String, enum: AUDIT_MODULES, required: true, index: true },
    entity: { type: String },
    entityId: { type: String },
    summary: { type: String, required: true },
    method: { type: String },
    path: { type: String },
    statusCode: { type: Number },
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// The audit page is "newest first, optionally filtered by module or actor",
// so the compound indexes match those two access patterns directly.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
