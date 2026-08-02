import { Schema, model, Document, Types } from "mongoose";

/**
 * Manual calendar overrides for a hall — admin-set only.
 *
 * Same decision as `RoomAvailability` and `TableAvailability`: this collection
 * stores **only what an admin explicitly marked**, never a row per date. The
 * public calendar's status for any given day is computed on read:
 *
 *   blocked   → an override with status "blocked"    (maintenance, private hold)
 *   booked    → an override with status "booked", OR a confirmed enquiry that day
 *   tentative → an override with status "tentative", OR a pending/reviewing enquiry
 *   available → everything else
 *
 * So there is no calendar pre-generation job, and a hall with no overrides and
 * no enquiries is simply available on every date.
 *
 * Dates are normalised to midnight UTC before saving, matching how the Hotel and
 * Restaurant modules handle day-granular dates — a hall is booked for a whole
 * day, never a time slot.
 */

export type HallDateStatus = "available" | "tentative" | "booked" | "blocked";

export const HALL_DATE_STATUSES: HallDateStatus[] = [
  "available",
  "tentative",
  "booked",
  "blocked",
];

export interface IHallAvailability extends Document {
  hallId: Types.ObjectId;
  date: Date;
  status: HallDateStatus;
  /** Internal note — "Sharma wedding", "Annual maintenance". Not public. */
  reason?: string;
  /** Set when the block came from approving an enquiry rather than by hand. */
  enquiryId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const hallAvailabilitySchema = new Schema<IHallAvailability>(
  {
    hallId: { type: Schema.Types.ObjectId, ref: "Hall", required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: HALL_DATE_STATUSES, required: true },
    reason: { type: String, trim: true, maxlength: 200 },
    enquiryId: { type: Schema.Types.ObjectId, ref: "HallEnquiry", default: null },
  },
  { timestamps: true }
);

// One override per hall per day — setting the same date twice updates it.
hallAvailabilitySchema.index({ hallId: 1, date: 1 }, { unique: true });

export const HallAvailability = model<IHallAvailability>(
  "HallAvailability",
  hallAvailabilitySchema
);
