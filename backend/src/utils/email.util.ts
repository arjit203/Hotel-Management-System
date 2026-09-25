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

/**
 * Escapes a value for interpolation into an HTML email body. Every template
 * below wraps each interpolated value in this — guest names, special requests,
 * hall/restaurant names and the like are user-supplied, and an unescaped `<a>`
 * or `<img>` in a name would otherwise render inside the admin's inbox.
 * Numbers and undefined are accepted so callers never have to pre-stringify.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Bodies carry verification/reset tokens, so production logs only ever get the
// recipient and subject. Development keeps the full body — that console log IS
// the mail delivery when SMTP isn't configured.
function shouldLogBody(): boolean {
  return process.env.NODE_ENV !== "production";
}

function isValidSmtpConfig(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return false;

  const combined = `${host} ${user}`.toLowerCase();
  const looksLikePlaceholder = PLACEHOLDER_PATTERNS.some((p) => combined.includes(p));

  return !looksLikePlaceholder;
}

/**
 * Drops the cached transporter so the next send rebuilds it from the current
 * environment.
 *
 * The transporter is built once and reused, which is right for a process whose
 * SMTP settings come from `.env` and never change. Now that the Settings module
 * can write `SMTP_*` into `process.env` at runtime, a change would otherwise
 * not be picked up until a restart. `settings.service.ts` calls this after
 * saving integration credentials.
 *
 * Additive only — nothing about how mail is sent or when it degrades to
 * console logging has changed.
 */
export function resetEmailTransport(): void {
  transporter = null;
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
    // Bounded so a dead/blackholed SMTP host can't hold a request (or a
    // fire-and-forget send) open for minutes on the OS default TCP timeout.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
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
    if (shouldLogBody()) console.log(`   Body: ${html}`);
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
    if (shouldLogBody()) console.log(`   Body: ${html}`);
  }
}

export function buildVerificationEmailHtml(name: string, verifyUrl: string): string {
  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Please verify your email for your 7 Vachan account by clicking the link below:</p>
    <p><a href="${escapeHtml(verifyUrl)}">Verify Email</a></p>
    <p>This link expires in ${process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || 24} hour(s).</p>
    <p>If you did not create this account, please ignore this email.</p>
  `;
}

export function buildPasswordResetEmailHtml(name: string, resetUrl: string): string {
  return `
    <p>Hi ${escapeHtml(name)},</p>
    <p>We received a request to reset your 7 Vachan account password.</p>
    <p><a href="${escapeHtml(resetUrl)}">Reset Password</a></p>
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
  /** Advance actually received online. Omitted by older callers → line hidden. */
  advancePaid?: number;
  /** What remains to be settled at the property. */
  balanceDue?: number;
}): string {
  const paymentLines =
    typeof details.advancePaid === "number" && details.advancePaid > 0
      ? `<li><strong>Advance Paid:</strong> ₹${escapeHtml(details.advancePaid)}</li>
      <li><strong>Balance Due at the Property:</strong> ₹${escapeHtml(details.balanceDue ?? details.totalAmount - details.advancePaid)}</li>`
      : "";
  const roomsList = details.rooms.map((r) => `<li>${escapeHtml(r.numRooms)} × ${escapeHtml(r.name)}</li>`).join("");
  return `
    <p>Hi ${escapeHtml(details.guestName)},</p>
    <p>Your booking at <strong>${escapeHtml(details.hotelName)}</strong> is confirmed!</p>
    <ul>
      <li><strong>Booking Reference:</strong> ${escapeHtml(details.bookingReference)}</li>
      <li><strong>Check-in:</strong> ${escapeHtml(details.checkIn)}</li>
      <li><strong>Check-out:</strong> ${escapeHtml(details.checkOut)}</li>
      <li><strong>Total Amount:</strong> ₹${escapeHtml(details.totalAmount)}</li>
      ${paymentLines}
    </ul>
    <p><strong>Rooms:</strong></p>
    <ul>${roomsList}</ul>
    <p>Please keep your booking reference handy for check-in.${
      paymentLines ? " The remaining balance is payable at the property." : ""
    }</p>
  `;
}

// Internal notification to the property when a hotel booking is confirmed
// (sent after payment verification, never on the unpaid 'pending' create).
export function buildNewHotelBookingAdminEmailHtml(details: {
  bookingReference: string;
  hotelName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  rooms: { name: string; numRooms: number }[];
  checkIn: string;
  checkOut: string;
  numGuests: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  specialRequest?: string;
}): string {
  const roomsList = details.rooms.map((r) => `<li>${escapeHtml(r.numRooms)} × ${escapeHtml(r.name)}</li>`).join("");
  return `
    <p>A new hotel booking has been confirmed (advance paid online).</p>
    <ul>
      <li><strong>Booking Reference:</strong> ${escapeHtml(details.bookingReference)}</li>
      <li><strong>Hotel:</strong> ${escapeHtml(details.hotelName)}</li>
      <li><strong>Guest:</strong> ${escapeHtml(details.guestName)} (${escapeHtml(details.guestEmail)}, ${escapeHtml(details.guestPhone)})</li>
      <li><strong>Stay:</strong> ${escapeHtml(details.checkIn)} → ${escapeHtml(details.checkOut)}</li>
      <li><strong>Guests:</strong> ${escapeHtml(details.numGuests)}</li>
      <li><strong>Total:</strong> ₹${escapeHtml(details.totalAmount)}</li>
      <li><strong>Advance Paid:</strong> ₹${escapeHtml(details.advancePaid)}</li>
      <li><strong>Balance Due at Property:</strong> ₹${escapeHtml(details.balanceDue)}</li>
    </ul>
    <p><strong>Rooms:</strong></p>
    <ul>${roomsList}</ul>
    ${details.specialRequest ? `<p><strong>Special request:</strong> ${escapeHtml(details.specialRequest)}</p>` : ""}
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
    <p>Hi ${escapeHtml(details.guestName)},</p>
    <p>Your booking <strong>${escapeHtml(details.bookingReference)}</strong> at ${escapeHtml(details.hotelName)} has been cancelled.</p>
    ${
      details.refundEligible
        ? `<p>You are eligible for a refund of ₹${escapeHtml(details.refundAmount ?? 0)}. It will be processed to your original payment method.</p>`
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
      <li><strong>Booking Reference:</strong> ${escapeHtml(details.bookingReference)}</li>
      <li><strong>Hotel:</strong> ${escapeHtml(details.hotelName)}</li>
      <li><strong>Guest:</strong> ${escapeHtml(details.guestName)} (${escapeHtml(details.guestEmail)})</li>
      <li><strong>Refund Eligible:</strong> ${details.refundEligible ? "Yes" : "No"}</li>
      ${details.refundEligible ? `<li><strong>Refund Amount:</strong> ₹${escapeHtml(details.refundAmount ?? 0)}</li>` : ""}
    </ul>
  `;
}

// ============================================================
// Restaurant module (added 2026-08-02). Additive only — every builder above is
// untouched. Table reservations take no payment, so these deliberately carry no
// amount, advance or refund figures.
// ============================================================

export function buildReservationConfirmationEmailHtml(details: {
  guestName: string;
  restaurantName: string;
  diningAreaName: string;
  date: string;
  timeSlot: string;
  partySize: number;
  reservationReference: string;
  restaurantAddress: string;
  restaurantPhone: string;
}): string {
  return `
    <p>Hi ${escapeHtml(details.guestName)},</p>
    <p>Your table at <strong>${escapeHtml(details.restaurantName)}</strong> is confirmed.</p>
    <ul>
      <li><strong>Reference:</strong> ${escapeHtml(details.reservationReference)}</li>
      <li><strong>Date:</strong> ${escapeHtml(details.date)}</li>
      <li><strong>Time:</strong> ${escapeHtml(details.timeSlot)}</li>
      <li><strong>Guests:</strong> ${escapeHtml(details.partySize)}</li>
      <li><strong>Seating:</strong> ${escapeHtml(details.diningAreaName)}</li>
    </ul>
    <p><strong>Where:</strong> ${escapeHtml(details.restaurantAddress)}</p>
    <p>Running late or need to change something? Call us on ${escapeHtml(details.restaurantPhone)}.</p>
    <p>We look forward to hosting you.</p>
  `;
}

export function buildReservationCancellationEmailHtml(details: {
  guestName: string;
  restaurantName: string;
  reservationReference: string;
  date: string;
  timeSlot: string;
  /** Renders the internal-facing variant for the admin notification. */
  forAdmin?: boolean;
  guestEmail?: string;
  partySize?: number;
}): string {
  if (details.forAdmin) {
    return `
      <p>A table reservation has been cancelled by the guest.</p>
      <ul>
        <li><strong>Reference:</strong> ${escapeHtml(details.reservationReference)}</li>
        <li><strong>Restaurant:</strong> ${escapeHtml(details.restaurantName)}</li>
        <li><strong>Guest:</strong> ${escapeHtml(details.guestName)} (${escapeHtml(details.guestEmail || "—")})</li>
        <li><strong>Was booked for:</strong> ${escapeHtml(details.date)} at ${escapeHtml(details.timeSlot)}</li>
        <li><strong>Party size:</strong> ${escapeHtml(details.partySize ?? "—")}</li>
      </ul>
      <p>The tables have been released back to availability automatically.</p>
    `;
  }

  return `
    <p>Hi ${escapeHtml(details.guestName)},</p>
    <p>Your reservation at <strong>${escapeHtml(details.restaurantName)}</strong> has been cancelled.</p>
    <ul>
      <li><strong>Reference:</strong> ${escapeHtml(details.reservationReference)}</li>
      <li><strong>Was booked for:</strong> ${escapeHtml(details.date)} at ${escapeHtml(details.timeSlot)}</li>
    </ul>
    <p>No charge was made. We hope to welcome you another time.</p>
  `;
}

// ============================================================
// Marriage Hall module (added 2026-08-03). Additive only — every builder above
// is untouched.
//
// These deliberately never say "booked" or "confirmed" on submission, and carry
// no amount, advance or payment figure. Per RULES.md §14 a hall enquiry is a
// request to talk: nothing is reserved and nothing is charged until an admin
// approves and the family has spoken to the venue.
// ============================================================

export function buildHallEnquiryReceivedEmailHtml(details: {
  guestName: string;
  hallName: string;
  enquiryReference: string;
  eventDate: string;
  eventType: string;
  guestCount: number;
  packageName?: string;
  contactPhone: string;
  /** Public URL where the guest can check this enquiry's status. */
  trackUrl?: string;
  /** Renders the internal-facing variant for the admin notification. */
  forAdmin?: boolean;
  guestEmail?: string;
  guestPhone?: string;
}): string {
  if (details.forAdmin) {
    return `
      <p>A new marriage hall enquiry has been submitted.</p>
      <ul>
        <li><strong>Reference:</strong> ${escapeHtml(details.enquiryReference)}</li>
        <li><strong>Venue:</strong> ${escapeHtml(details.hallName)}</li>
        <li><strong>Guest:</strong> ${escapeHtml(details.guestName)} (${escapeHtml(details.guestEmail || "—")}${
          details.guestPhone ? `, ${escapeHtml(details.guestPhone)}` : ""
        })</li>
        <li><strong>Event:</strong> ${escapeHtml(details.eventType)} on ${escapeHtml(details.eventDate)}</li>
        <li><strong>Expected guests:</strong> ${escapeHtml(details.guestCount)}</li>
        <li><strong>Package of interest:</strong> ${escapeHtml(details.packageName || "Not specified")}</li>
      </ul>
      <p>The date is <strong>not held</strong> yet. Review the enquiry in the admin panel and
      confirm it once the family has been spoken to.</p>
    `;
  }

  return `
    <p>Dear ${escapeHtml(details.guestName)},</p>
    <p>Thank you for considering <strong>${escapeHtml(details.hallName)}</strong> for your ${escapeHtml(details.eventType.toLowerCase())}.</p>
    <p>We have received your enquiry and one of our event managers will call you shortly to
    discuss the details.</p>
    <ul>
      <li><strong>Reference:</strong> ${escapeHtml(details.enquiryReference)}</li>
      <li><strong>Preferred date:</strong> ${escapeHtml(details.eventDate)}</li>
      <li><strong>Occasion:</strong> ${escapeHtml(details.eventType)}</li>
      <li><strong>Expected guests:</strong> ${escapeHtml(details.guestCount)}</li>
      ${details.packageName ? `<li><strong>Package of interest:</strong> ${escapeHtml(details.packageName)}</li>` : ""}
    </ul>
    <p><strong>Please note:</strong> this is an enquiry, not a confirmed booking. Your date is
    reserved only once we have spoken and confirmed it with you. No payment has been taken.</p>
    ${
      details.trackUrl
        ? `<p>You can check the status of this enquiry at any time here:<br>
           <a href="${escapeHtml(details.trackUrl)}">${escapeHtml(details.trackUrl)}</a></p>`
        : ""
    }
    <p>If you'd like to speak to us sooner, call ${escapeHtml(details.contactPhone)}.</p>
    <p>We would be honoured to host your celebration.</p>
  `;
}

export function buildHallEnquiryStatusEmailHtml(details: {
  guestName: string;
  hallName: string;
  enquiryReference: string;
  eventDate: string;
  status: string;
  contactPhone: string;
  /** Public URL where the guest can check this enquiry's status. */
  trackUrl?: string;
}): string {
  const body: Record<string, string> = {
    approved: `<p>Good news — <strong>${escapeHtml(details.hallName)}</strong> is available for your date and we
      would be delighted to host you.</p>
      <p>Our event manager will be in touch to finalise the arrangements. Your date is held
      tentatively and becomes a confirmed booking once we complete that conversation.</p>`,
    confirmed: `<p>Your booking at <strong>${escapeHtml(details.hallName)}</strong> is now confirmed and the date
      is held in your name.</p>
      <p>Our team will guide you through the remaining arrangements.</p>`,
    declined: `<p>We're sorry — we aren't able to host your event at <strong>${escapeHtml(details.hallName)}</strong>
      on that date.</p>
      <p>Please do call us; we may be able to suggest a nearby date that works beautifully.</p>`,
  };

  return `
    <p>Dear ${escapeHtml(details.guestName)},</p>
    ${body[details.status] || `<p>There is an update on your enquiry.</p>`}
    <ul>
      <li><strong>Reference:</strong> ${escapeHtml(details.enquiryReference)}</li>
      <li><strong>Date:</strong> ${escapeHtml(details.eventDate)}</li>
    </ul>
    ${
      details.trackUrl
        ? `<p>Full details are here:<br><a href="${escapeHtml(details.trackUrl)}">${escapeHtml(details.trackUrl)}</a></p>`
        : ""
    }
    <p>Questions? Call us on ${escapeHtml(details.contactPhone)}.</p>
  `;
}
