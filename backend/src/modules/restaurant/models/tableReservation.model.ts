import { Schema, model, Document, Types } from "mongoose";

export type ReservationStatus =
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

/**
 * A table reservation.
 *
 * Two business rules from RULES.md §2 are baked into this shape:
 *
 *  1. **Instant, not approval-based.** A reservation is created directly as
 *     `confirmed`. There is no "pending admin approval" state — that belongs to
 *     the Marriage Hall vertical, not here. (Hotel is likewise instant, but it
 *     starts `pending` because it waits on a payment; a table reservation takes
 *     no payment, so it confirms immediately.)
 *
 *  2. **No payment.** There are deliberately no amount, advance, balance,
 *     Razorpay or invoice fields. Table reservations are free to hold, and food
 *     ordering/payment is Phase 2. Do not add them here without a rules change.
 *
 * Guest checkout is supported — `userId` is optional, exactly as with
 * HotelBooking, because no booking flow may force login.
 */
export interface ITableReservation extends Document {
  userId?: Types.ObjectId | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  restaurantId: Types.ObjectId;
  diningAreaId: Types.ObjectId;
  /** Denormalised so a confirmation still reads correctly if an area is renamed. */
  diningAreaName: string;
  /** Midnight UTC, matching the availability collection's convention. */
  reservationDate: Date;
  timeSlot: string; // "19:30"
  partySize: number;
  /** Tables held for this party — derived from partySize and the area's seating. */
  tablesReserved: number;
  status: ReservationStatus;
  reservationReference: string;
  specialRequest?: string;
  /** "Birthday", "Anniversary" — drives a note to the floor team. */
  occasion?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tableReservationSchema = new Schema<ITableReservation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, lowercase: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    diningAreaId: { type: Schema.Types.ObjectId, ref: "DiningArea", required: true, index: true },
    diningAreaName: { type: String, required: true },
    reservationDate: { type: Date, required: true, index: true },
    timeSlot: { type: String, required: true },
    partySize: { type: Number, required: true, min: 1 },
    tablesReserved: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["confirmed", "seated", "completed", "cancelled", "no_show"],
      default: "confirmed",
      index: true,
    },
    reservationReference: { type: String, required: true, unique: true, index: true },
    specialRequest: { type: String, trim: true },
    occasion: { type: String, trim: true },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// The availability query's access pattern: area + date + slot, active only.
tableReservationSchema.index({ diningAreaId: 1, reservationDate: 1, timeSlot: 1, status: 1 });

export const TableReservation = model<ITableReservation>(
  "TableReservation",
  tableReservationSchema
);
