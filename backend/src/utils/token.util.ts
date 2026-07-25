import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";

export type ActorType = "user" | "admin";

export interface JwtPayload {
  id: string;
  role: string;
  actorType: ActorType;
}

/**
 * Signs a JWT for a User or Admin.
 * Uses separate secrets/expiry per actor type (per RULES.md isolation requirement).
 */
export function signJwt(payload: JwtPayload): string {
  const isAdmin = payload.actorType === "admin";
  const secret = isAdmin ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET;
  const expiresIn = (isAdmin
    ? process.env.ADMIN_JWT_EXPIRES_IN
    : process.env.JWT_EXPIRES_IN) || "7d";

  if (!secret) {
    throw new Error(
      `${isAdmin ? "ADMIN_JWT_SECRET" : "JWT_SECRET"} is not set in environment variables.`
    );
  }

  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

export function verifyJwt(token: string, actorType: ActorType): JwtPayload {
  const isAdmin = actorType === "admin";
  const secret = isAdmin ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      `${isAdmin ? "ADMIN_JWT_SECRET" : "JWT_SECRET"} is not set in environment variables.`
    );
  }

  return jwt.verify(token, secret) as JwtPayload;
}

/**
 * Generates a random raw token (sent to user via email/link) and its SHA-256 hash
 * (stored in DB). Never store the raw token — this is standard practice for
 * password-reset / email-verification tokens.
 */
export function generateRawAndHashedToken(): { rawToken: string; hashedToken: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
