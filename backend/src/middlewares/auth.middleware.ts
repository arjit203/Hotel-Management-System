import { Request, Response, NextFunction } from "express";
import { verifyJwt, ActorType } from "../utils/token.util";
import { Admin } from "../modules/auth/models/admin.model";

// Extend Express Request to carry the authenticated actor.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * `name` and `email` are present for admins only, and only so the audit
       * middleware can name the actor without a second database round trip —
       * `authenticate` already loads the account, so widening its `select` is
       * free. Nothing authorises on them; authorisation reads `role`.
       */
      actor?: {
        id: string;
        role: string;
        actorType: ActorType;
        name?: string;
        email?: string;
      };
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }
  return null;
}

/**
 * Verifies a JWT for the given actor type (user/admin) and attaches
 * req.actor = { id, role, actorType }. Responds 401 if missing/invalid.
 */
export function authenticate(actorType: ActorType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token missing." });
    }

    let payload;
    try {
      payload = verifyJwt(token, actorType);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }

    if (payload.actorType !== actorType) {
      return res.status(401).json({ success: false, message: "Invalid token for this route." });
    }

    /**
     * ── Admin tokens are re-checked against the database on every request ──
     *
     * A JWT carries the role it was signed with, so without this an admin
     * demoted from super_admin to staff would keep full access until their
     * token expired — up to seven days — and a deactivated account would keep
     * working entirely. The brief requires permission changes to take effect
     * immediately, and that cannot be done from the token alone.
     *
     * Cost is one indexed findById per admin request. Admin traffic is a few
     * staff, not the public, so that is a fair price for instant revocation.
     *
     * User tokens are deliberately NOT re-checked: that path is public-facing,
     * far higher volume, and carries no privileged role to revoke.
     */
    if (actorType === "admin") {
      try {
        const admin = await Admin.findById(payload.id).select("role isActive name email");

        if (!admin) {
          return res.status(401).json({ success: false, message: "This account no longer exists." });
        }
        if (!admin.isActive) {
          return res
            .status(403)
            .json({ success: false, message: "This account has been deactivated." });
        }

        // The live role wins over whatever the token was signed with.
        req.actor = {
          id: payload.id,
          role: admin.role,
          actorType: "admin",
          name: admin.name,
          email: admin.email,
        };
        return next();
      } catch {
        return res
          .status(503)
          .json({ success: false, message: "Could not verify your account. Please retry." });
      }
    }

    req.actor = payload;
    next();
  };
}

/**
 * Role-based access control. Use after `authenticate()`.
 * Example: router.get('/admin/only', authenticate('admin'), requireRole('super_admin'), handler)
 */
/**
 * Like authenticate(), but never rejects the request. If a valid token is
 * present, req.actor is populated; if missing/invalid, the request proceeds
 * as an anonymous/guest request. Required for guest-checkout booking flows
 * per RULES.md ("do not force login for any booking flow"), while still
 * letting logged-in users get their booking linked to their account.
 */
export function optionalAuthenticate(actorType: ActorType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return next();

    try {
      const payload = verifyJwt(token, actorType);
      if (payload.actorType === actorType) {
        req.actor = payload;
      }
    } catch {
      // Invalid/expired token on an optional route — proceed as guest rather than failing.
    }
    next();
  };
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.actor) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }
    if (!allowedRoles.includes(req.actor.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions." });
    }
    next();
  };
}
