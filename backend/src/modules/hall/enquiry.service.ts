import crypto from "crypto";
import { HallEnquiry, HallEnquiryStatus } from "./models/hallEnquiry.model";
import { HallAvailability } from "./models/hallAvailability.model";
import {
  getHallById,
  getPackageById,
  getShowcaseById,
  isDateOpenForEnquiry,
  startOfDayUTC,
} from "./hall.service";
import { ApiError } from "../../utils/apiError.util";
import {
  sendEmail,
  buildHallEnquiryReceivedEmailHtml,
  buildHallEnquiryStatusEmailHtml,
} from "../../utils/email.util";
import { CreateHallEnquiryInput } from "./hall.validation";

/**
 * Hall enquiry service.
 *
 * The whole point of this file is that it does NOT book anything.
 * `RULES.md` §14 makes hall bookings approval-first: an enquiry is a request to
 * talk, and the date is not held until an admin sets the status to `confirmed`.
 *
 * Consequently there is no availability decrement, no payment, no Razorpay
 * order and no confirmation email that says "booked" — the guest email says
 * "we've received your enquiry and will call you". Do not add any of that
 * without a rules change; copying Hotel's instant-booking flow here would be a
 * business error, not just a technical one.
 */

/**
 * Public page where a family can check an enquiry's status.
 *
 * Email is not a status board — it gets buried, filtered, or lands in an inbox
 * someone else checks. Every enquiry email carries this link so "is our date
 * booked?" never requires a phone call.
 */
function trackUrlFor(reference: string): string {
  const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/marriage-hall/enquiry/${reference}`;
}

function generateEnquiryReference(): string {
  // 7VH- prefix sits alongside the hotel booking's 7V- and the restaurant
  // reservation's 7VR-, so staff can tell the three apart at a glance.
  return `7VH-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createEnquiry(input: CreateHallEnquiryInput, userId?: string) {
  const hall = await getHallById(input.hallId);

  const eventDate = startOfDayUTC(new Date(input.eventDate));
  const today = startOfDayUTC(new Date());

  if (eventDate < today) {
    throw new ApiError(400, "Please choose an event date in the future.");
  }

  // The venue needs lead time to plan. Configurable per hall.
  const earliest = new Date(today);
  earliest.setUTCDate(earliest.getUTCDate() + hall.minimumNoticeDays);
  if (eventDate < earliest) {
    throw new ApiError(
      400,
      `${hall.name} needs at least ${hall.minimumNoticeDays} days' notice. Please choose a later date or call us to discuss.`
    );
  }

  if (input.guestCount > hall.floatingCapacity) {
    throw new ApiError(
      400,
      `${hall.name} accommodates up to ${hall.floatingCapacity} guests. Please call us to discuss a larger event.`
    );
  }

  // Blocked/booked dates are refused up front rather than accepting an enquiry
  // the venue will only have to decline.
  const open = await isDateOpenForEnquiry(String(hall._id), eventDate);
  if (!open) {
    throw new ApiError(
      409,
      "That date is no longer available. Please pick another date, or send us your alternate date and we'll call you."
    );
  }

  let alternateDate: Date | null = null;
  if (input.alternateDate) {
    alternateDate = startOfDayUTC(new Date(input.alternateDate));
    if (alternateDate < today) {
      throw new ApiError(400, "The alternate date is in the past.");
    }
  }

  // Snapshot the chosen package / theme names so a later rename in the admin
  // panel doesn't silently rewrite what the family actually asked for.
  let packageName: string | undefined;
  if (input.packageId) {
    const pkg = await getPackageById(input.packageId);
    if (String(pkg.hallId) !== String(hall._id)) {
      throw new ApiError(400, "That package does not belong to this hall.");
    }
    packageName = pkg.name;
  }

  let decorationThemeName: string | undefined;
  if (input.decorationThemeId) {
    const theme = await getShowcaseById(input.decorationThemeId);
    if (String(theme.hallId) !== String(hall._id)) {
      throw new ApiError(400, "That decoration theme does not belong to this hall.");
    }
    decorationThemeName = theme.title;
  }

  const enquiry = await HallEnquiry.create({
    enquiryReference: generateEnquiryReference(),
    hallId: hall._id,
    userId: userId || null,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    eventDate,
    alternateDate,
    eventType: input.eventType,
    guestCount: input.guestCount,
    packageId: input.packageId || null,
    packageName,
    decorationThemeId: input.decorationThemeId || null,
    decorationThemeName,
    cateringPreference: input.cateringPreference,
    budgetRange: input.budgetRange,
    specialRequirements: input.specialRequirements,
    status: "pending",
  });

  // Email is best-effort: a mail failure must not lose the enquiry, which is
  // the only record of the lead. Same policy as the Hotel/Restaurant modules.
  const details = {
    guestName: enquiry.guestName,
    hallName: hall.name,
    enquiryReference: enquiry.enquiryReference,
    eventDate: eventDate.toDateString(),
    eventType: enquiry.eventType,
    guestCount: enquiry.guestCount,
    packageName,
    contactPhone: hall.contactPhone,
    trackUrl: trackUrlFor(enquiry.enquiryReference),
  };

  void sendEmail({
    to: enquiry.guestEmail,
    subject: `We've received your enquiry — ${enquiry.enquiryReference}`,
    html: buildHallEnquiryReceivedEmailHtml(details),
  }).catch(() => undefined);

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    void sendEmail({
      to: adminEmail,
      subject: `New hall enquiry — ${enquiry.eventType}, ${eventDate.toDateString()}`,
      html: buildHallEnquiryReceivedEmailHtml({ ...details, forAdmin: true }),
    }).catch(() => undefined);
  }

  return enquiry;
}

/** Public lookup. Strips internal notes — the guest must never see those. */
export async function getEnquiryByReference(enquiryReference: string) {
  const enquiry = await HallEnquiry.findOne({ enquiryReference }).select("-adminNotes");
  if (!enquiry) throw new ApiError(404, "Enquiry not found.");
  return enquiry;
}

export async function getMyEnquiries(userId: string) {
  return HallEnquiry.find({ userId }).select("-adminNotes").sort({ createdAt: -1 });
}

export async function listEnquiriesForAdmin(
  filters: { hallId?: string; status?: string; date?: string } = {}
) {
  const query: Record<string, unknown> = {};
  if (filters.hallId) query.hallId = filters.hallId;
  if (filters.status) query.status = filters.status;
  if (filters.date) query.eventDate = startOfDayUTC(new Date(filters.date));
  return HallEnquiry.find(query).sort({ createdAt: -1 });
}

/**
 * Admin status change.
 *
 * The one side effect that matters: moving an enquiry to `confirmed` writes a
 * `booked` override for that date, which is what actually takes the date off the
 * public calendar. Moving it away from `confirmed` releases that override — but
 * only if the override was created by this enquiry, so a hand-placed staff block
 * on the same day is never silently removed.
 */
export async function updateEnquiryStatus(
  enquiryId: string,
  status: HallEnquiryStatus,
  adminNotes?: string
) {
  const enquiry = await HallEnquiry.findById(enquiryId);
  if (!enquiry) throw new ApiError(404, "Enquiry not found.");

  const previousStatus = enquiry.status;

  enquiry.status = status;
  if (adminNotes !== undefined) enquiry.adminNotes = adminNotes;
  enquiry.respondedAt = new Date();
  if (status === "cancelled" || status === "declined") enquiry.cancelledAt = new Date();
  await enquiry.save();

  if (status === "confirmed" && previousStatus !== "confirmed") {
    await HallAvailability.findOneAndUpdate(
      { hallId: enquiry.hallId, date: enquiry.eventDate },
      {
        hallId: enquiry.hallId,
        date: enquiry.eventDate,
        status: "booked",
        reason: `${enquiry.eventType} — ${enquiry.guestName} (${enquiry.enquiryReference})`,
        enquiryId: enquiry._id,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  if (previousStatus === "confirmed" && status !== "confirmed") {
    await HallAvailability.findOneAndDelete({
      hallId: enquiry.hallId,
      date: enquiry.eventDate,
      enquiryId: enquiry._id,
    });
  }

  // Only tell the guest about outcomes that mean something to them. There is no
  // point emailing "your enquiry moved to reviewing".
  if (["approved", "confirmed", "declined"].includes(status)) {
    const hall = await getHallById(String(enquiry.hallId));
    void sendEmail({
      to: enquiry.guestEmail,
      subject: `Update on your enquiry — ${enquiry.enquiryReference}`,
      html: buildHallEnquiryStatusEmailHtml({
        guestName: enquiry.guestName,
        hallName: hall.name,
        enquiryReference: enquiry.enquiryReference,
        eventDate: enquiry.eventDate.toDateString(),
        status,
        contactPhone: hall.contactPhone,
        trackUrl: trackUrlFor(enquiry.enquiryReference),
      }),
    }).catch(() => undefined);
  }

  return enquiry;
}

/**
 * Guest-initiated withdrawal.
 *
 * Ownership is proved by matching the enquiry email or the logged-in user —
 * never by the reference alone, which is shareable. Same rule as hotel booking
 * and table reservation cancellation.
 */
export async function cancelEnquiry(
  enquiryReference: string,
  requester: { guestEmail?: string; userId?: string },
  cancellationReason?: string
) {
  const enquiry = await HallEnquiry.findOne({ enquiryReference });
  if (!enquiry) throw new ApiError(404, "Enquiry not found.");

  const ownsByUser =
    Boolean(requester.userId) && String(enquiry.userId ?? "") === String(requester.userId);
  const ownsByEmail =
    Boolean(requester.guestEmail) &&
    enquiry.guestEmail.toLowerCase() === requester.guestEmail!.toLowerCase();

  if (!ownsByUser && !ownsByEmail) {
    throw new ApiError(
      403,
      "Please confirm the email address you used, so we know this enquiry is yours."
    );
  }

  if (enquiry.status === "cancelled") {
    throw new ApiError(409, "This enquiry has already been withdrawn.");
  }
  if (enquiry.status === "confirmed") {
    throw new ApiError(
      409,
      "This booking is already confirmed. Please call us directly to make any change."
    );
  }

  enquiry.status = "cancelled";
  enquiry.cancelledAt = new Date();
  if (cancellationReason) enquiry.cancellationReason = cancellationReason;
  await enquiry.save();

  return enquiry;
}
