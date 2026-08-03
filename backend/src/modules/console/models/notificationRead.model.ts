import { Schema, model, Document, Types } from "mongoose";

/**
 * Per-admin read state for the notification centre.
 *
 * ── Why only the *read* half is stored ──
 * The notifications themselves are derived from bookings, reservations,
 * enquiries and reviews (see `activity.service.ts`) rather than written into a
 * table, so there is no row to flip a `read` flag on. What has to persist is
 * the small, admin-specific fact that *this person* has seen *that item* — and
 * that is genuinely new information, not a copy of something else.
 *
 * The upside is that read state cannot drift from the underlying record: delete
 * a booking and its notification stops existing, leaving one orphaned read row
 * that the TTL sweeps up.
 *
 * ── `markAllReadBefore` is a watermark, not a bulk insert ──
 * "Mark all read" on a busy week would otherwise write hundreds of rows for one
 * click. Instead it stores a single timestamp per admin, and anything older is
 * treated as read. Individual rows are only for items marked read one at a
 * time, which is the rare case.
 */

export interface INotificationRead extends Document {
  adminId: Types.ObjectId;
  /** The `ActivityItem.key`, e.g. `booking_created:64f…`. */
  notificationKey: string;
  readAt: Date;
}

const notificationReadSchema = new Schema<INotificationRead>({
  adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
  notificationKey: { type: String, required: true },
  readAt: { type: Date, default: Date.now },
});

// One row per admin per item; a repeated "mark read" is an upsert, not a duplicate.
notificationReadSchema.index({ adminId: 1, notificationKey: 1 }, { unique: true });

// The feed only looks back 30 days, so a read marker older than 90 is dead
// weight. Mongo expires these on its own; nothing in the app has to sweep.
notificationReadSchema.index({ readAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const NotificationRead = model<INotificationRead>(
  "NotificationRead",
  notificationReadSchema
);

/**
 * The "everything before this instant is read" watermark, one per admin.
 * Separate collection because it is one document per admin, not per item.
 */
export interface INotificationWatermark extends Document {
  adminId: Types.ObjectId;
  readBefore: Date;
}

const notificationWatermarkSchema = new Schema<INotificationWatermark>({
  adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true, unique: true, index: true },
  readBefore: { type: Date, required: true },
});

export const NotificationWatermark = model<INotificationWatermark>(
  "NotificationWatermark",
  notificationWatermarkSchema
);
