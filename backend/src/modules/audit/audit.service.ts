import { AuditLog, AuditAction, AuditModule, AUDIT_ACTIONS, AUDIT_MODULES } from "./models/auditLog.model";

/**
 * Audit log writing and querying.
 *
 * ── Writes never fail a request ──
 * `record()` swallows its own errors. An audit row is important, but not more
 * important than the booking whose confirmation it describes: if Mongo hiccups
 * while writing the log, the guest's payment must still succeed. Failures go to
 * the console, which is where every other non-fatal backend problem goes.
 */

export interface RecordAuditInput {
  actorId?: string | null;
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  action: AuditAction;
  module: AuditModule;
  entity?: string;
  entityId?: string;
  summary: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

export async function record(input: RecordAuditInput): Promise<void> {
  try {
    await AuditLog.create({
      ...input,
      actorId: input.actorId || null,
    });
  } catch (err) {
    console.error("Audit log write failed (request itself was unaffected):", err);
  }
}

export interface ListAuditQuery {
  module?: string;
  action?: string;
  actorId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(query: ListAuditQuery = {}) {
  const filter: Record<string, unknown> = {};

  if (query.module && AUDIT_MODULES.includes(query.module as AuditModule)) {
    filter.module = query.module;
  }
  if (query.action && AUDIT_ACTIONS.includes(query.action as AuditAction)) {
    filter.action = query.action;
  }
  if (query.actorId) filter.actorId = query.actorId;

  // Inclusive on both ends: an admin filtering "3rd to 3rd" means that whole
  // day, not the single instant of midnight.
  if (query.from || query.to) {
    const range: Record<string, Date> = {};
    if (query.from) range.$gte = startOfDay(query.from);
    if (query.to) range.$lte = endOfDay(query.to);
    filter.createdAt = range;
  }

  if (query.search?.trim()) {
    const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    filter.$or = [{ summary: rx }, { actorName: rx }, { actorEmail: rx }, { entity: rx }, { path: rx }];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));

  const [rows, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Distinct actors seen in the log, so the filter dropdown can be populated. */
export async function listAuditActors() {
  const actors = await AuditLog.aggregate([
    {
      $group: {
        _id: "$actorId",
        name: { $last: "$actorName" },
        email: { $last: "$actorEmail" },
        role: { $last: "$actorRole" },
        count: { $sum: 1 },
        lastSeen: { $max: "$createdAt" },
      },
    },
    { $sort: { lastSeen: -1 } },
    { $limit: 100 },
  ]);

  return actors.map((a) => ({
    id: a._id ? String(a._id) : null,
    name: a.name,
    email: a.email,
    role: a.role,
    count: a.count,
    lastSeen: a.lastSeen,
  }));
}

function startOfDay(value: string): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value: string): Date {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}
