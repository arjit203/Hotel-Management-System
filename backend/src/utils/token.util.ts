import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";

export type ActorType = "user" | "admin";

export interface JwtPayload {
  id: string;
  role: string;
  actorType: ActorType;
  /**
   * Admin tokens only: the account's `tokenVersion` at sign time. Bumping the
   * stored version (password reset, deactivation) revokes every token signed
   * before it. Absent on tokens issued before this claim existed, which counts
   * as 0 — the stored default — so the deploy logs nobody out.
   */
  tv?: number;
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

  return jwt.sign(payload, secret, { expiresIn, algorithm: "HS256" } as SignOptions);
}

export function verifyJwt(token: string, actorType: ActorType): JwtPayload {
  const isAdmin = actorType === "admin";
  const secret = isAdmin ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      `${isAdmin ? "ADMIN_JWT_SECRET" : "JWT_SECRET"} is not set in environment variables.`
    );
  }

  // Pin the algorithm: we only ever sign HS256, so never let the token's own
  // header choose how it is verified.
  return jwt.verify(token, secret, { algorithms: ["HS256"] }) as JwtPayload;
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
