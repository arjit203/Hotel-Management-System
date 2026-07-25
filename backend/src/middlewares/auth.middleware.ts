import { Request, Response, NextFunction } from "express";
import { verifyJwt, ActorType } from "../utils/token.util";

// Extend Express Request to carry the authenticated actor.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: { id: string; role: string; actorType: ActorType };
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
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token missing." });
    }

    try {
      const payload = verifyJwt(token, actorType);
      if (payload.actorType !== actorType) {
        return res.status(401).json({ success: false, message: "Invalid token for this route." });
      }
      req.actor = payload;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
  };
}

/**
 * Role-based access control. Use after `authenticate()`.
 * Example: router.get('/admin/only', authenticate('admin'), requireRole('super_admin'), handler)
 */
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
