import { Schema, model, Document, Types } from "mongoose";

/**
 * MANUAL overrides only — e.g. the admin blocks the Private Dining room for a
 * private event, or closes outdoor seating in the rain.
 *
 * This is the same design decision as RoomAvailability in the Hotel module, and
 * for the same reason: real bookable availability is computed on read as
 *
 *   totalTables − blockedTables(date, slot) − activeReservations(date, slot)
 *
 * in restaurant.service.ts. Storing only the exceptions keeps the collection
 * small and avoids a background job pre-generating a row per area per slot per
 * day forever.
 *
 * `timeSlot` is optional: omit it to block the area for the whole day.
 */
export interface ITableAvailability extends Document {
  diningAreaId: Types.ObjectId;
  date: Date; // midnight UTC, matching RoomAvailability's convention
  /** e.g. "19:30". Omitted = the entire day is blocked. */
  timeSlot?: string;
  blockedTables: number;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tableAvailabilitySchema = new Schema<ITableAvailability>(
  {
    diningAreaId: { type: Schema.Types.ObjectId, ref: "DiningArea", required: true, index: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, trim: true },
    blockedTables: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

// One override per area per date per slot. A day-wide block (no timeSlot) and a
// slot-specific block can coexist; the service sums both.
tableAvailabilitySchema.index({ diningAreaId: 1, date: 1, timeSlot: 1 }, { unique: true });

export const TableAvailability = model<ITableAvailability>(
  "TableAvailability",
  tableAvailabilitySchema
);
