import { Schema, model, Document, Types } from "mongoose";

export type HotelBookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "cancelled"
  | "refund_pending"
  | "refunded";

// -- Feature 4 (Phase 3.6): one booking can contain multiple room categories --
export interface IBookedRoom {
  roomId: Types.ObjectId;
  categoryName: string;
  roomName: string;
  numRooms: number;
  pricePerNight: number;
  subtotal: number;
}

export interface IHotelBooking extends Document {
  userId?: Types.ObjectId | null; // null = guest booking, per RULES.md guest checkout support
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  hotelId: Types.ObjectId;
  rooms: IBookedRoom[];
  checkInDate: Date;
  checkOutDate: Date;
  numGuests: number;
  status: HotelBookingStatus;
  totalAmount: number;
  advanceRequired: number; // configurable advance amount computed at booking time (Feature 1)
  advancePaid: number; // actually verified/received amount — 0 until payment succeeds
  balanceDue: number;
  specialRequest?: string;
  bookingReference: string; // human-friendly reference shown to guest
  // -- Razorpay payment tracking (Feature 1, Phase 3.6) --
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentStatus?: "created" | "paid" | "failed";
  paymentTime?: Date;
  // -- Cancellation (Feature 2, Phase 3.6) --
  cancelledAt?: Date;
  cancellationReason?: string;
  refundEligible?: boolean; // computed at cancellation time from the cancellation policy
  refundAmount?: number; // amount owed back to the guest, if any (actual refund wired in Feature 1)
  createdAt: Date;
  updatedAt: Date;
}

const bookedRoomSchema = new Schema<IBookedRoom>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    categoryName: { type: String, required: true },
    roomName: { type: String, required: true },
    numRooms: { type: Number, required: true, min: 1 },
    pricePerNight: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const hotelBookingSchema = new Schema<IHotelBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, trim: true, lowercase: true },
    guestPhone: { type: String, required: true, trim: true },
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    rooms: { type: [bookedRoomSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    numGuests: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "completed",
        "cancelled",
        "refund_pending",
        "refunded",
      ],
      default: "pending",
    },
    totalAmount: { type: Number, required: true, min: 0 },
    advanceRequired: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    specialRequest: { type: String, trim: true },
    bookingReference: { type: String, required: true, unique: true, index: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String, select: false }, // not needed in normal reads
    paymentStatus: { type: String, enum: ["created", "paid", "failed"] },
    paymentTime: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true },
    refundEligible: { type: Boolean },
    refundAmount: { type: Number, min: 0 },
  },
  { timestamps: true }
);

hotelBookingSchema.index({ "rooms.roomId": 1, checkInDate: 1, checkOutDate: 1, status: 1 });

export const HotelBooking = model<IHotelBooking>("HotelBooking", hotelBookingSchema);
