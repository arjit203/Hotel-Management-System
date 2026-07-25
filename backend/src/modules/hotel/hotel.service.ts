import { Types } from "mongoose";
import { Hotel } from "./models/hotel.model";
import { Room } from "./models/room.model";
import { RoomAvailability } from "./models/roomAvailability.model";
import { HotelBooking } from "./models/hotelBooking.model";
import { ApiError } from "../../utils/apiError.util";
import {
  CreateHotelInput,
  UpdateHotelInput,
  CreateRoomInput,
  UpdateRoomInput,
} from "./hotel.validation";

// ---------- HOTEL CRUD ----------
export async function listHotels(filters: { branchId?: string; isActive?: boolean } = {}) {
  const query: Record<string, unknown> = {};
  if (filters.branchId) query.branchId = filters.branchId;
  query.isActive = filters.isActive ?? true;
  return Hotel.find(query).sort({ createdAt: -1 });
}

export async function getHotelBySlug(slug: string) {
  const hotel = await Hotel.findOne({ slug, isActive: true });
  if (!hotel) throw new ApiError(404, "Hotel not found.");
  return hotel;
}

export async function getHotelById(hotelId: string) {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(404, "Hotel not found.");
  return hotel;
}

export async function createHotel(input: CreateHotelInput) {
  const existing = await Hotel.findOne({ slug: input.slug });
  if (existing) throw new ApiError(409, "A hotel with this slug already exists.");
  return Hotel.create(input);
}

export async function updateHotel(hotelId: string, updates: UpdateHotelInput) {
  const hotel = await Hotel.findByIdAndUpdate(hotelId, updates, { new: true });
  if (!hotel) throw new ApiError(404, "Hotel not found.");
  return hotel;
}

export async function deleteHotel(hotelId: string) {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(404, "Hotel not found.");

  const activeRoomCount = await Room.countDocuments({ hotelId, isActive: true });
  if (activeRoomCount > 0) {
    throw new ApiError(409, "Cannot delete a hotel with active rooms. Deactivate/remove rooms first.");
  }

  // Soft delete — preserves booking history integrity.
  hotel.isActive = false;
  await hotel.save();
  return hotel;
}

// ---------- ROOM CRUD ----------
export async function listRoomsForHotel(hotelId: string) {
  return Room.find({ hotelId, isActive: true }).sort({ basePrice: 1 });
}

export async function getRoomBySlug(hotelId: string, slug: string) {
  const room = await Room.findOne({ hotelId, slug, isActive: true });
  if (!room) throw new ApiError(404, "Room not found.");
  return room;
}

export async function getRoomById(roomId: string) {
  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found.");
  return room;
}

export async function createRoom(hotelId: string, input: CreateRoomInput) {
  await getHotelById(hotelId); // ensures hotel exists

  const existing = await Room.findOne({ hotelId, slug: input.slug });
  if (existing) throw new ApiError(409, "A room with this slug already exists for this hotel.");

  return Room.create({ ...input, hotelId });
}

export async function updateRoom(roomId: string, updates: UpdateRoomInput) {
  const room = await Room.findByIdAndUpdate(roomId, updates, { new: true });
  if (!room) throw new ApiError(404, "Room not found.");
  return room;
}

export async function deleteRoom(roomId: string) {
  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found.");

  const activeBookingCount = await HotelBooking.countDocuments({
    roomId,
    status: { $in: ["pending", "confirmed", "checked_in"] },
  });
  if (activeBookingCount > 0) {
    throw new ApiError(409, "Cannot delete a room with active/upcoming bookings.");
  }

  room.isActive = false;
  await room.save();
  return room;
}

// ---------- AVAILABILITY ----------

function toMidnightUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function enumerateDates(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = [];
  const cursor = toMidnightUTC(checkIn);
  const end = toMidnightUTC(checkOut);
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Computes how many units of a room category are available across every
 * night of the requested stay. Availability = totalRooms - manuallyBlocked(date)
 * - overlappingConfirmedOrPendingBookings(date), taking the MINIMUM across all
 * nights in the range (a stay is only bookable if every night has capacity).
 */
export async function getAvailableCount(roomId: string, checkIn: Date, checkOut: Date): Promise<number> {
  const room = await getRoomById(roomId);
  const dates = enumerateDates(checkIn, checkOut);

  if (dates.length === 0) {
    throw new ApiError(400, "Invalid date range.");
  }

  // Overlapping bookings (any booking whose [checkIn, checkOut) overlaps requested range)
  const overlappingBookings = await HotelBooking.find({
    roomId,
    status: { $in: ["pending", "confirmed", "checked_in"] },
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  }).select("checkInDate checkOutDate numRooms");

  const blockedOverrides = await RoomAvailability.find({
    roomId,
    date: { $in: dates },
  }).select("date blockedCount");

  const blockedByDate = new Map<string, number>();
  for (const override of blockedOverrides) {
    blockedByDate.set(override.date.toISOString(), override.blockedCount);
  }

  let minAvailable = room.totalRooms;

  for (const date of dates) {
    const bookedOnThisDate = overlappingBookings
      .filter((b) => b.checkInDate <= date && b.checkOutDate > date)
      .reduce((sum, b) => sum + b.numRooms, 0);

    const manuallyBlocked = blockedByDate.get(date.toISOString()) || 0;
    const availableOnThisDate = room.totalRooms - bookedOnThisDate - manuallyBlocked;

    minAvailable = Math.min(minAvailable, availableOnThisDate);
  }

  return Math.max(0, minAvailable);
}

export async function setAvailabilityOverride(
  roomId: string,
  date: Date,
  blockedCount: number,
  reason?: string
) {
  await getRoomById(roomId); // ensures room exists
  const normalizedDate = toMidnightUTC(date);

  return RoomAvailability.findOneAndUpdate(
    { roomId, date: normalizedDate },
    { blockedCount, reason },
    { upsert: true, new: true }
  );
}

export async function listAvailabilityOverrides(roomId: string) {
  return RoomAvailability.find({ roomId }).sort({ date: 1 });
}

export { enumerateDates, toMidnightUTC };
