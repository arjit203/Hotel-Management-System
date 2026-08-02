import { Schema, model, Document, Types } from "mongoose";

/**
 * A hall booking ENQUIRY — never a booking.
 *
 * `RULES.md` §14: "Hall bookings: never instant/self-serve. Customer submits
 * enquiry/request → Admin Panel approval required → then payment is triggered."
 *
 * So, deliberately absent from this model and not to be added without a rules
 * change: totalAmount, advancePaid, paymentStatus, razorpayOrderId,
 * razorpayPaymentId, invoice. Submitting this form reserves nothing and charges
 * nothing. The date is only held once an admin moves the enquiry to `confirmed`,
 * which writes a `HallAvailability` row.
 *
 * Status lifecycle:
 *   pending → reviewing → approved → confirmed
 *                      ↘ declined
 *   (any) → cancelled            (guest-initiated withdrawal)
 *
 * `approved` means the venue is willing and the offline conversation is on;
 * `confirmed` means the date is actually held. Only `confirmed` blocks the
 * public calendar as booked — an approved-but-unconfirmed date stays tentative,
 * because two families can be in conversation about the same auspicious date.
 */

export type HallEnquiryStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "confirmed"
  | "declined"
  | "cancelled";

export const HALL_ENQUIRY_STATUSES: HallEnquiryStatus[] = [
  "pending",
  "reviewing",
  "approved",
  "confirmed",
  "declined",
  "cancelled",
];

export interface IHallEnquiry extends Document {
  /** `7VH-XXXXXXXX`. Distinguishes a hall enquiry from `7V-` and `7VR-`. */
  enquiryReference: string;

  hallId: Types.ObjectId;
  /** Set when a logged-in user submits; null for guest submissions. */
  userId?: Types.ObjectId | null;

  guestName: string;
  guestEmail: string;
  guestPhone: string;

  eventDate: Date;
  /** Second date the family would also accept. Helps the venue offer options. */
  alternateDate?: Date | null;
  eventType: string;
  guestCount: number;

  /** Snapshotted at submit time so a later package rename doesn't rewrite history. */
  packageId?: Types.ObjectId | null;
  packageName?: string;
  decorationThemeId?: Types.ObjectId | null;
  decorationThemeName?: string;
  cateringPreference?: string;

  budgetRange?: string;
  specialRequirements?: string;

  status: HallEnquiryStatus;
  /** Internal only — never returned on the public lookup route. */
  adminNotes?: string;
  respondedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const hallEnquirySchema = new Schema<IHallEnquiry>(
  {
    enquiryReference: { type: String, required: true, unique: true, index: true },

    hallId: { type: Schema.Types.ObjectId, ref: "Hall", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    guestPhone: { type: String, required: true, trim: true },

    eventDate: { type: Date, required: true, index: true },
    alternateDate: { type: Date, default: null },
    eventType: { type: String, required: true, trim: true },
    guestCount: { type: Number, required: true, min: 1 },

    packageId: { type: Schema.Types.ObjectId, ref: "HallPackage", default: null },
    packageName: { type: String, trim: true },
    decorationThemeId: { type: Schema.Types.ObjectId, ref: "HallShowcase", default: null },
    decorationThemeName: { type: String, trim: true },
    cateringPreference: { type: String, trim: true },

    budgetRange: { type: String, trim: true },
    specialRequirements: { type: String, trim: true, maxlength: 1000 },

    status: { type: String, enum: HALL_ENQUIRY_STATUSES, default: "pending", index: true },
    adminNotes: { type: String, trim: true, maxlength: 1000 },
    respondedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export const HallEnquiry = model<IHallEnquiry>("HallEnquiry", hallEnquirySchema);
