import { Schema, model, Document, Types } from "mongoose";

export type HotelBookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

export interface IHotelBooking extends Document {
  userId?: Types.ObjectId | null; // null = guest booking, per RULES.md guest checkout support
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  hotelId: Types.ObjectId;
  roomId: Types.ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  numGuests: number;
  numRooms: number;
  status: HotelBookingStatus;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  specialRequest?: string;
  bookingReference: string; // human-friendly reference shown to guest
  createdAt: Date;
  updatedAt: Date;
}

const hotelBookingSchema = new Schema<IHotelBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, trim: true, lowercase: true },
    guestPhone: { type: String, required: true, trim: true },
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    numGuests: { type: Number, required: true, min: 1 },
    numRooms: { type: Number, required: true, min: 1, default: 1 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "checked_in", "checked_out", "cancelled"],
      default: "pending",
    },
    totalAmount: { type: Number, required: true, min: 0 },
    advancePaid: { type: Number, default: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    specialRequest: { type: String, trim: true },
    bookingReference: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

hotelBookingSchema.index({ roomId: 1, checkInDate: 1, checkOutDate: 1, status: 1 });

export const HotelBooking = model<IHotelBooking>("HotelBooking", hotelBookingSchema);
