import { Schema, model, Document, Types } from "mongoose";

/**
 * This collection holds MANUAL overrides only (e.g. admin blocks a room
 * category for maintenance on specific dates). Real-time availability for
 * booking purposes = totalRooms - blockedCount(date) - overlappingConfirmedBookings(date),
 * computed in booking.service.ts. This keeps the collection small (only
 * exceptions are stored) rather than one document per room per day forever.
 */
export interface IRoomAvailability extends Document {
  roomId: Types.ObjectId;
  date: Date; // stored at midnight UTC, one doc per blocked date
  blockedCount: number; // how many units of this room category are blocked on this date
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomAvailabilitySchema = new Schema<IRoomAvailability>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    date: { type: Date, required: true },
    blockedCount: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

roomAvailabilitySchema.index({ roomId: 1, date: 1 }, { unique: true });

export const RoomAvailability = model<IRoomAvailability>("RoomAvailability", roomAvailabilitySchema);
