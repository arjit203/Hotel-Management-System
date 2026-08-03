import {
  NotificationRead,
  NotificationWatermark,
} from "./models/notificationRead.model";
import {
  collectActivity,
  scopeForAdmin,
  NOTIFIABLE_TYPES,
  type ActivityItem,
  type ActivityModule,
} from "./activity.service";
import { Admin } from "../auth/models/admin.model";
import { ApiError } from "../../utils/apiError.util";

/**
 * Notification centre.
 *
 * Notifications *are* activity items — the ones worth interrupting someone for
 * (`NOTIFIABLE_TYPES`) — with a per-admin read flag layered on top. See
 * `activity.service.ts` for why the feed is derived rather than stored, and
 * `models/notificationRead.model.ts` for why only the read half persists.
 *
 * Scope is resolved per admin on every call: a hall manager's bell counts hall
 * enquiries and hall reviews, and is blind to the hotel's bookings. That falls
 * out of `scopeForAdmin`, which reads the same `effectiveScope` the route
 * guards use, so the bell can never disagree with what the API would allow.
 */

export interface NotificationItem extends ActivityItem {
  read: boolean;
}

async function resolveScope(adminId: string): Promise<ActivityModule[]> {
  const admin = await Admin.findById(adminId).select("role businessScope");
  if (!admin) throw new ApiError(401, "This account no longer exists.");
  return scopeForAdmin(admin);
}

async function readState(adminId: string) {
  const [rows, watermark] = await Promise.all([
    NotificationRead.find({ adminId }).select("notificationKey").lean(),
    NotificationWatermark.findOne({ adminId }).lean(),
  ]);

  return {
    keys: new Set(rows.map((r) => r.notificationKey)),
    readBefore: watermark?.readBefore ? new Date(watermark.readBefore) : null,
  };
}

function applyReadState(
  items: ActivityItem[],
  state: { keys: Set<string>; readBefore: Date | null }
): NotificationItem[] {
  return items.map((item) => ({
    ...item,
    read:
      state.keys.has(item.key) ||
      (state.readBefore !== null && new Date(item.at) <= state.readBefore),
  }));
}

export async function listNotifications(
  adminId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const modules = await resolveScope(adminId);

  const [activity, state] = await Promise.all([
    collectActivity({ modules, types: NOTIFIABLE_TYPES, limit: 100, perSource: 40 }),
    readState(adminId),
  ]);

  const all = applyReadState(activity, state);
  const unreadCount = all.filter((i) => !i.read).length;

  const visible = options.unreadOnly ? all.filter((i) => !i.read) : all;
  return { items: visible.slice(0, Math.min(100, options.limit ?? 50)), unreadCount };
}

/**
 * Just the count, for the bell badge.
 *
 * Split from `listNotifications` because the badge polls and the dropdown does
 * not — there is no reason to build and serialise fifty items to render "3".
 */
export async function unreadCount(adminId: string): Promise<number> {
  const modules = await resolveScope(adminId);
  const [activity, state] = await Promise.all([
    collectActivity({ modules, types: NOTIFIABLE_TYPES, limit: 100, perSource: 40 }),
    readState(adminId),
  ]);
  return applyReadState(activity, state).filter((i) => !i.read).length;
}

/** Idempotent: marking an already-read item read again is a no-op upsert. */
export async function markRead(adminId: string, notificationKey: string): Promise<void> {
  await NotificationRead.updateOne(
    { adminId, notificationKey },
    { $setOnInsert: { readAt: new Date() } },
    { upsert: true }
  );
}

export async function markUnread(adminId: string, notificationKey: string): Promise<void> {
  await NotificationRead.deleteOne({ adminId, notificationKey });
}

/**
 * Marks everything currently visible as read by moving the watermark to now.
 *
 * One document written per click regardless of how many notifications there
 * were. Anything that arrives a second later is newer than the watermark and
 * correctly stays unread.
 */
export async function markAllRead(adminId: string): Promise<void> {
  await NotificationWatermark.updateOne(
    { adminId },
    { $set: { readBefore: new Date() } },
    { upsert: true }
  );
}
