import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

// Values that ship in .env.example — treat these as "not really configured"
const PLACEHOLDER_VALUES = new Set([
  "smtp.example.com",
  "your_smtp_user",
  "your_smtp_pass",
  "your_smtp_password",
  "user@example.com",
  "example.com",
  "changeme",
]);

function isPlaceholder(value: string | undefined): boolean {
  if (!value || value.trim() === "") return true;
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return !isPlaceholder(host) && !isPlaceholder(user) && !isPlaceholder(pass);
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
 * Sends an email. In local/dev, if SMTP is not configured (missing or
 * placeholder values), logs to console instead of connecting — so auth
 * flows remain testable without real SMTP setup.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log("📧 [DEV MODE — SMTP not configured] Email not actually sent.");
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${html}`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || '"7 Vachan" <no-reply@7vachan.com>',
    to,
    subject,
    html,
  });
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
