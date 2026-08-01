import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

const PLACEHOLDER_PATTERNS = [
  "example.com",
  "your_smtp",
  "your-smtp",
  "smtp.example",
  "changeme",
  "placeholder",
];

function isValidSmtpConfig(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return false;

  const combined = `${host} ${user}`.toLowerCase();
  const looksLikePlaceholder = PLACEHOLDER_PATTERNS.some((p) => combined.includes(p));

  return !looksLikePlaceholder;
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email. If SMTP is not configured OR configured with placeholder
 * values (e.g. smtp.example.com from .env.example), automatically falls back
 * to Development Mode: logs the email content (and any link inside it) to
 * console instead of attempting a real SMTP connection. Never throws — auth
 * flows (signup/login/forgot-password) must keep working regardless of email
 * delivery status.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!isValidSmtpConfig()) {
    console.log("📧 [DEV MODE — SMTP not configured or using placeholder values]");
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${html}`);
    return;
  }

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || '"7 Vachan" <no-reply@7vachan.com>',
      to,
      subject,
      html,
    });
  } catch (error) {
    // Email delivery failure must never crash/break the calling auth flow.
    console.error("⚠️  Email send failed (continuing anyway):", error);
    console.log(`   [Fallback log] To: ${to} | Subject: ${subject}`);
    console.log(`   Body: ${html}`);
  }
}

export function buildVerificationEmailHtml(name: string, verifyUrl: string): string {
  return `
    <p>Hi ${name},</p>
    <p>Please verify your email for your 7 Vachan account by clicking the link below:</p>
    <p><a href="${verifyUrl}">Verify Email</a></p>
    <p>This link expires in ${process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || 24} hour(s).</p>
    <p>If you did not create this account, please ignore this email.</p>
  `;
}

export function buildPasswordResetEmailHtml(name: string, resetUrl: string): string {
  return `
    <p>Hi ${name},</p>
    <p>We received a request to reset your 7 Vachan account password.</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link expires in ${process.env.RESET_TOKEN_EXPIRY_MINUTES || 30} minute(s).</p>
    <p>If you did not request this, please ignore this email — your password will remain unchanged.</p>
  `;
}

export function buildBookingConfirmationEmailHtml(details: {
  guestName: string;
  hotelName: string;
  rooms: { name: string; numRooms: number }[];
  checkIn: string;
  checkOut: string;
  bookingReference: string;
  totalAmount: number;
}): string {
  const roomsList = details.rooms.map((r) => `<li>${r.numRooms} × ${r.name}</li>`).join("");
  return `
    <p>Hi ${details.guestName},</p>
    <p>Your booking at <strong>${details.hotelName}</strong> is confirmed!</p>
    <ul>
      <li><strong>Booking Reference:</strong> ${details.bookingReference}</li>
      <li><strong>Check-in:</strong> ${details.checkIn}</li>
      <li><strong>Check-out:</strong> ${details.checkOut}</li>
      <li><strong>Total Amount:</strong> ₹${details.totalAmount}</li>
    </ul>
    <p><strong>Rooms:</strong></p>
    <ul>${roomsList}</ul>
    <p>Please keep your booking reference handy for check-in. Payment can be settled at the property (online payment coming soon).</p>
  `;
}

// -- Feature 2 (Phase 3.6): booking cancellation --
export function buildCancellationGuestEmailHtml(details: {
  guestName: string;
  hotelName: string;
  bookingReference: string;
  refundEligible: boolean;
  refundAmount?: number;
}): string {
  return `
    <p>Hi ${details.guestName},</p>
    <p>Your booking <strong>${details.bookingReference}</strong> at ${details.hotelName} has been cancelled.</p>
    ${
      details.refundEligible
        ? `<p>You are eligible for a refund of ₹${details.refundAmount ?? 0}. It will be processed to your original payment method.</p>`
        : `<p>This booking was not eligible for a refund based on our cancellation policy.</p>`
    }
  `;
}

export function buildCancellationAdminEmailHtml(details: {
  bookingReference: string;
  hotelName: string;
  guestName: string;
  guestEmail: string;
  refundEligible: boolean;
  refundAmount?: number;
}): string {
  return `
    <p>A booking has been cancelled and may require action.</p>
    <ul>
      <li><strong>Booking Reference:</strong> ${details.bookingReference}</li>
      <li><strong>Hotel:</strong> ${details.hotelName}</li>
      <li><strong>Guest:</strong> ${details.guestName} (${details.guestEmail})</li>
      <li><strong>Refund Eligible:</strong> ${details.refundEligible ? "Yes" : "No"}</li>
      ${details.refundEligible ? `<li><strong>Refund Amount:</strong> ₹${details.refundAmount ?? 0}</li>` : ""}
    </ul>
  `;
}
