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
    "rooms.roomId": roomId,
    status: { $in: ["pending", "confirmed", "checked_in"] },
  });
  if (activeBookingCount > 0) {
    throw new ApiError(409, "Cannot delete a room with active/upcoming bookings.");
  }

  room.isActive = false;
  await room.save();
  return room;
}

// ---------- ROOM SEARCH (Feature 3, Phase 3.6) ----------
export interface RoomSearchFilters {
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[]; // room must have ALL of these
  roomType?: string; // categoryName, exact match
  sortBy?: "price" | "popularity" | "newest" | "rating";
}

export async function searchRooms(hotelId: string, filters: RoomSearchFilters) {
  const query: Record<string, unknown> = { hotelId, isActive: true };

  if (filters.guests) query.maxOccupancy = { $gte: filters.guests };
  if (filters.roomType) query.categoryName = filters.roomType;
  if (filters.minPrice || filters.maxPrice) {
    query.basePrice = {
      ...(filters.minPrice ? { $gte: filters.minPrice } : {}),
      ...(filters.maxPrice ? { $lte: filters.maxPrice } : {}),
    };
  }
  if (filters.amenities && filters.amenities.length > 0) {
    query.amenities = { $all: filters.amenities };
  }

  let rooms = await Room.find(query);

  // Availability filter — only applied when both dates are given, since it
  // requires a concrete date range (reuses the existing getAvailableCount
  // logic, no new availability calculation invented here).
  if (filters.checkInDate && filters.checkOutDate) {
    const checkIn = new Date(filters.checkInDate);
    const checkOut = new Date(filters.checkOutDate);
    const availabilityResults = await Promise.all(
      rooms.map(async (room) => ({
        room,
        available: await getAvailableCount(String(room._id), checkIn, checkOut),
      }))
    );
    rooms = availabilityResults.filter((r) => r.available > 0).map((r) => r.room);
  }

  // "popularity" = total historical bookings for that room (confirmed or
  // beyond) — a simple, honest proxy given no dedicated view/click tracking
  // exists in this project. "rating" sort is NOT implemented: reviews are
  // hotel-level, not room-level (see PROJECT_DOCUMENTATION.md open item —
  // per-room ratings would require a Review schema redesign, which is out of
  // scope here per "never redesign database unless required"). Falls back to
  // "newest" rather than silently faking a per-room rating value.
  if (filters.sortBy === "popularity") {
    const counts = await HotelBooking.aggregate([
      { $unwind: "$rooms" },
      { $match: { "rooms.roomId": { $in: rooms.map((r) => r._id) }, status: { $ne: "cancelled" } } },
      { $group: { _id: "$rooms.roomId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    rooms.sort((a, b) => (countMap.get(String(b._id)) || 0) - (countMap.get(String(a._id)) || 0));
  } else if (filters.sortBy === "price") {
    rooms.sort((a, b) => a.basePrice - b.basePrice);
  } else {
    // "newest" and the "rating" fallback both land here.
    rooms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return rooms;
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
  // Feature 4: roomId now lives inside the rooms[] array, not top-level —
  // a single booking may reserve this room type alongside others.
  const overlappingBookings = await HotelBooking.find({
    "rooms.roomId": roomId,
    status: { $in: ["pending", "confirmed", "checked_in"] },
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  }).select("checkInDate checkOutDate rooms");

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
      .reduce((sum, b) => {
        const matchingLine = b.rooms.find((r) => String(r.roomId) === String(roomId));
        return sum + (matchingLine?.numRooms || 0);
      }, 0);

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
