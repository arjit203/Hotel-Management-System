import bcrypt from "bcryptjs";
import { Model } from "mongoose";
import { User, IUser } from "./models/user.model";
import { Admin, IAdmin } from "./models/admin.model";
import { signJwt, generateRawAndHashedToken, hashToken } from "../../utils/token.util";
import {
  sendEmail,
  buildVerificationEmailHtml,
  buildPasswordResetEmailHtml,
} from "../../utils/email.util";
import { SignupInput, LoginInput } from "./auth.validation";

const SALT_ROUNDS = 10;

class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ---------- USER: SIGNUP ----------
export async function signupUser(input: SignupInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const { rawToken, hashedToken } = generateRawAndHashedToken();
  const expiryHours = Number(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS) || 24;

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
  });

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your 7 Vachan account",
    html: buildVerificationEmailHtml(user.name, verifyUrl),
  });

  return { id: user._id, name: user.name, email: user.email };
}

// ---------- USER: VERIFY EMAIL ----------
export async function verifyUserEmail(rawToken: string) {
  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) {
    throw new ApiError(400, "Verification link is invalid or has expired.");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return { verified: true };
}

// ---------- USER: LOGIN ----------
export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = signJwt({ id: String(user._id), role: user.role, actorType: "user" });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
  };
}

// ---------- ADMIN: LOGIN ----------
// NOTE: No public admin signup endpoint — per RULES.md, admins are provisioned
// internally (Super Admin creates Branch Admin/Staff accounts). This module only
// implements login + password reset for admins.
export async function loginAdmin(input: LoginInput) {
  const admin = await Admin.findOne({ email: input.email }).select("+passwordHash");
  if (!admin || !admin.isActive) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(input.password, admin.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signJwt({ id: String(admin._id), role: admin.role, actorType: "admin" });

  return {
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      branchId: admin.branchId,
    },
  };
}

// ---------- FORGOT PASSWORD (shared logic for User/Admin) ----------
async function forgotPasswordGeneric<T extends IUser | IAdmin>(
  model: Model<T>,
  email: string,
  portalUrl: string
) {
  const account = await model.findOne({ email });

  // Always respond success-shaped (caller controls the generic message) to avoid
  // leaking which emails exist in the system.
  if (!account) return;

  const { rawToken, hashedToken } = generateRawAndHashedToken();
  const expiryMinutes = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES) || 30;

  account.passwordResetToken = hashedToken;
  account.passwordResetExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);
  await account.save();

  const resetUrl = `${portalUrl}/reset-password/${rawToken}`;
  await sendEmail({
    to: account.email,
    subject: "Reset your 7 Vachan password",
    html: buildPasswordResetEmailHtml(account.name, resetUrl),
  });
}

export async function forgotUserPassword(email: string) {
  await forgotPasswordGeneric(User, email, process.env.FRONTEND_URL || "");
}

export async function forgotAdminPassword(email: string) {
  await forgotPasswordGeneric(Admin, email, process.env.ADMIN_PANEL_URL || "");
}

// ---------- RESET PASSWORD (shared logic for User/Admin) ----------
async function resetPasswordGeneric<T extends IUser | IAdmin>(
  model: Model<T>,
  rawToken: string,
  newPassword: string
) {
  const hashedToken = hashToken(rawToken);

  const account = await model
    .findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    })
    .select("+passwordResetToken +passwordResetExpires +passwordHash");

  if (!account) {
    throw new ApiError(400, "Reset link is invalid or has expired.");
  }

  account.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  account.passwordResetToken = undefined;
  account.passwordResetExpires = undefined;
  await account.save();
}

export async function resetUserPassword(rawToken: string, newPassword: string) {
  await resetPasswordGeneric(User, rawToken, newPassword);
}

export async function resetAdminPassword(rawToken: string, newPassword: string) {
  await resetPasswordGeneric(Admin, rawToken, newPassword);
}

export { ApiError };
