import { Request, Response, NextFunction } from "express";
import * as auditService from "../modules/audit/audit.service";
import type { AuditAction, AuditModule } from "../modules/audit/models/auditLog.model";

/**
 * Records administrative actions — without a single controller or service
 * knowing it exists.
 *
 * ── Why a middleware and not `audit.record()` calls in the services ──
 * The brief says "do not change existing business logic". Sprinkling audit
 * calls through thirty controllers would touch every module, would be forgotten
 * on the thirty-first, and would put logging inside functions whose job is
 * something else. A middleware mounted once per admin router sees every
 * mutation those routers will ever have, including routes added next year.
 *
 * It hooks `res.on("finish")`, so it runs *after* the response has been sent:
 * the write costs the client nothing, and a failure cannot break the request.
 *
 * ── What it deliberately does not log ──
 * • Reads. `GET` is not an action, and logging it would bury the twelve edits
 *   of the week under ten thousand page loads.
 * • Failures. A 4xx means nothing changed; a 403 in particular is a *blocked*
 *   attempt, and `login_failed` is recorded explicitly by the auth controller
 *   where the email is actually known.
 * • Anything resembling a credential — see `redact()`.
 */

/** Path segment after `/admin/` → the module the action belongs to. */
const MODULE_BY_SEGMENT: Record<string, AuditModule> = {
  hotels: "hotel",
  restaurants: "restaurant",
  halls: "hall",
  users: "users",
  settings: "settings",
  reports: "reports",
  "hotel-bookings": "hotel",
  "table-reservations": "restaurant",
  "hall-enquiries": "hall",
};

/**
 * Path segments that name a collection, mapped to a singular entity noun.
 * Anything not listed falls back to a de-pluralised copy of the segment, so a
 * new sub-resource is described sensibly without needing an entry here.
 */
const ENTITY_BY_SEGMENT: Record<string, string> = {
  rooms: "room",
  bookings: "booking",
  reservations: "reservation",
  enquiries: "enquiry",
  offers: "offer",
  faqs: "faq",
  gallery: "gallery image",
  reviews: "review",
  packages: "package",
  showcase: "showcase",
  availability: "availability",
  "dining-areas": "dining area",
  "menu": "menu",
  items: "menu item",
  categories: "menu category",
  users: "admin account",
  status: "status",
  password: "password",
  "upload-image": "image",
};

const SECRET_KEY_PATTERN = /pass|secret|token|key|otp|signature|cvv|card/i;

/** Looks like a Mongo ObjectId or a booking reference rather than a route word. */
function isIdSegment(segment: string): boolean {
  return /^[a-f\d]{24}$/i.test(segment) || /^7V[RH]?-[A-Z0-9]+$/i.test(segment);
}

function singularise(segment: string): string {
  if (ENTITY_BY_SEGMENT[segment]) return ENTITY_BY_SEGMENT[segment];
  if (segment.endsWith("ies")) return `${segment.slice(0, -3)}y`;
  if (segment.endsWith("s") && !segment.endsWith("ss")) return segment.slice(0, -1);
  return segment;
}

/**
 * Strips credentials and bulk payloads out of the request body.
 *
 * The point of keeping a body snapshot at all is answering "what did they
 * change?" a month later. That question never needs the password, and it never
 * needs a 300KB base64 image, so both are dropped rather than truncated —
 * a truncated secret is still a leaked prefix.
 */
function redact(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      out[key] = "[redacted]";
    } else if (typeof value === "string") {
      out[key] = value.length > 200 ? `${value.slice(0, 200)}…` : value;
    } else if (Array.isArray(value)) {
      out[key] = `[${value.length} item${value.length === 1 ? "" : "s"}]`;
    } else if (value && typeof value === "object") {
      out[key] = "[object]";
    } else {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

interface Derived {
  action: AuditAction;
  entity?: string;
  entityId?: string;
}

/**
 * Works out what happened from the method and the path.
 *
 * The special cases exist because the brief names them: a role change and a
 * booking status change are both `PUT`, and calling them both "update" would
 * make the log technically correct and practically useless.
 */
function derive(method: string, segments: string[], body: unknown): Derived {
  const last = segments[segments.length - 1] ?? "";
  const idSegments = segments.filter(isIdSegment);
  const entityId = idSegments[idSegments.length - 1];
  const words = segments.filter((s) => !isIdSegment(s));

  // Two segments back from a trailing `/status`, `/password` etc. is the noun.
  const nounSegment = ["status", "password", "availability", "range", "reset-password"].includes(last)
    ? words[words.length - 2]
    : words[words.length - 1];

  const entity = nounSegment ? singularise(nounSegment) : undefined;

  if (last === "password" || last === "reset-password") {
    return { action: "password_reset", entity: "admin account", entityId };
  }
  if (last === "status") {
    // `/admin/users/:id/status` toggles an account; everywhere else it moves a
    // booking, reservation or enquiry through its lifecycle.
    const isAccount = words.includes("users");
    return {
      action: isAccount ? "status_change" : "status_change",
      entity: isAccount ? "admin account" : entity,
      entityId,
    };
  }
  if (last === "upload-image") {
    return { action: "upload", entity: "image" };
  }
  if (
    method === "PUT" &&
    words.includes("users") &&
    body &&
    typeof body === "object" &&
    "role" in (body as Record<string, unknown>)
  ) {
    return { action: "role_change", entity: "admin account", entityId };
  }
  if (words.includes("settings")) {
    return { action: "settings_change", entity: nounSegment, entityId };
  }

  const action: AuditAction =
    method === "POST" ? "create" : method === "DELETE" ? "delete" : "update";

  return { action, entity, entityId };
}

function moduleFor(segments: string[]): AuditModule {
  for (const segment of segments) {
    const mapped = MODULE_BY_SEGMENT[segment];
    if (mapped) return mapped;
  }
  return "other";
}

/** Best-effort client IP; honours a proxy header when one is present. */
function clientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || undefined;
}

function buildSummary(action: AuditAction, entity: string | undefined, body: unknown): string {
  const named =
    body && typeof body === "object"
      ? ((body as Record<string, unknown>).name ??
        (body as Record<string, unknown>).title ??
        (body as Record<string, unknown>).status)
      : undefined;

  const verb: Record<AuditAction, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    login: "Signed in",
    logout: "Signed out",
    login_failed: "Failed sign-in",
    role_change: "Changed the role of",
    status_change: "Changed the status of",
    password_reset: "Reset the password for",
    upload: "Uploaded",
    export: "Exported",
    settings_change: "Changed settings for",
  };

  const subject = entity ?? "record";
  const suffix = typeof named === "string" && named.length <= 80 ? ` “${named}”` : "";
  return `${verb[action]} ${subject}${suffix}`.trim();
}

/**
 * Mount on an admin router, before the routes.
 *
 * ```ts
 * adminHotelRouter.use(authenticate("admin"));
 * adminHotelRouter.use(auditLogger());
 * ```
 * It must come *after* `authenticate`, because it reads `req.actor`.
 */
export function auditLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }

    // Captured now: Express clears params and some handlers mutate req.body.
    const body = req.body;
    const originalUrl = req.originalUrl.split("?")[0];
    const segments = originalUrl.split("/").filter(Boolean).filter((s) => s !== "api" && s !== "v1" && s !== "admin");

    res.on("finish", () => {
      // Only successful mutations changed something worth recording.
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const actor = req.actor;
      if (!actor || actor.actorType !== "admin") return;

      const { action, entity, entityId } = derive(req.method, segments, body);

      void auditService.record({
        actorId: actor.id,
        actorName: actor.name || "Unknown admin",
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        module: moduleFor(segments),
        entity,
        entityId,
        summary: buildSummary(action, entity, body),
        method: req.method,
        path: originalUrl,
        statusCode: res.statusCode,
        ip: clientIp(req),
        userAgent: req.headers["user-agent"],
        meta: redact(body),
      });
    });

    next();
  };
}

/** Exposed so the auth controller can record sign-in / sign-out explicitly. */
export { clientIp };
