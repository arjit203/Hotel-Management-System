import { isValidObjectId } from "mongoose";
import { Restaurant } from "./models/restaurant.model";
import { MenuCategory } from "./models/menuCategory.model";
import { MenuItem } from "./models/menuItem.model";
import { DiningArea } from "./models/diningArea.model";
import { TableAvailability } from "./models/tableAvailability.model";
import { TableReservation } from "./models/tableReservation.model";
import { ApiError } from "../../utils/apiError.util";
import {
  CreateRestaurantInput,
  UpdateRestaurantInput,
  CreateMenuCategoryInput,
  CreateMenuItemInput,
  MenuQueryInput,
  CreateDiningAreaInput,
} from "./restaurant.validation";

/**
 * Restaurant domain service.
 *
 * Deliberately mirrors hotel.service.ts: same soft-delete policy, same
 * dependent-data guards before deletion, and the same compute-availability-on-read
 * approach. Reviews, gallery, FAQs and offers are NOT handled here — they go
 * through the shared `content.service.ts` with `"restaurant"` as the polymorphic
 * type, exactly as the Hotel module does with `"hotel"`.
 */

/** A malformed id in a URL is a 404, not a Mongoose CastError surfacing as a 500. */
function assertObjectId(id: string, notFound: string): void {
  if (!isValidObjectId(id)) throw new ApiError(404, notFound);
}

// ---------- RESTAURANT ----------

export async function listRestaurants(filters: { branchId?: string } = {}) {
  const query: Record<string, unknown> = { isActive: true };
  if (filters.branchId) query.branchId = filters.branchId;
  return Restaurant.find(query).sort({ createdAt: -1 });
}

export async function getRestaurantBySlug(slug: string) {
  const restaurant = await Restaurant.findOne({ slug, isActive: true });
  if (!restaurant) throw new ApiError(404, "Restaurant not found.");
  return restaurant;
}

export async function getRestaurantById(id: string) {
  // A malformed id is simply "not found", never a CastError 500.
  if (!isValidObjectId(id)) throw new ApiError(404, "Restaurant not found.");
  const restaurant = await Restaurant.findById(id);
  if (!restaurant || !restaurant.isActive) throw new ApiError(404, "Restaurant not found.");
  return restaurant;
}

export async function createRestaurant(input: CreateRestaurantInput) {
  const existing = await Restaurant.findOne({ slug: input.slug });
  if (existing) throw new ApiError(409, "A restaurant with that slug already exists.");
  return Restaurant.create(input);
}

export async function updateRestaurant(id: string, updates: UpdateRestaurantInput) {
  assertObjectId(id, "Restaurant not found.");
  if (updates.slug) {
    const clash = await Restaurant.findOne({ slug: updates.slug, _id: { $ne: id } });
    if (clash) throw new ApiError(409, "A restaurant with that slug already exists.");
  }
  const restaurant = await Restaurant.findByIdAndUpdate(id, updates, { new: true });
  if (!restaurant) throw new ApiError(404, "Restaurant not found.");
  return restaurant;
}

/**
 * Soft delete, matching the Hotel module. Blocked while dependent active data
 * exists so reservation history is never orphaned.
 */
export async function deleteRestaurant(id: string) {
  assertObjectId(id, "Restaurant not found.");
  const activeAreas = await DiningArea.countDocuments({ restaurantId: id, isActive: true });
  if (activeAreas > 0) {
    throw new ApiError(
      409,
      "Cannot delete a restaurant that still has active dining areas. Remove them first."
    );
  }
  const restaurant = await Restaurant.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!restaurant) throw new ApiError(404, "Restaurant not found.");
  return restaurant;
}

// ---------- MENU CATEGORIES ----------

export async function listMenuCategories(restaurantId: string) {
  return MenuCategory.find({ restaurantId, isActive: true }).sort({ displayOrder: 1, name: 1 });
}

export async function createMenuCategory(restaurantId: string, input: CreateMenuCategoryInput) {
  await getRestaurantById(restaurantId);
  const clash = await MenuCategory.findOne({ restaurantId, slug: input.slug });
  if (clash) throw new ApiError(409, "A menu category with that slug already exists.");
  return MenuCategory.create({ ...input, restaurantId });
}

export async function updateMenuCategory(id: string, updates: Partial<CreateMenuCategoryInput>) {
  assertObjectId(id, "Menu category not found.");
  const category = await MenuCategory.findByIdAndUpdate(id, updates, { new: true });
  if (!category) throw new ApiError(404, "Menu category not found.");
  return category;
}

export async function deleteMenuCategory(id: string) {
  assertObjectId(id, "Menu category not found.");
  const itemCount = await MenuItem.countDocuments({ categoryId: id, isActive: true });
  if (itemCount > 0) {
    throw new ApiError(
      409,
      `Cannot delete a category that still holds ${itemCount} item(s). Move or remove them first.`
    );
  }
  const category = await MenuCategory.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!category) throw new ApiError(404, "Menu category not found.");
  return category;
}

// ---------- MENU ITEMS ----------

export async function getMenuItemById(id: string) {
  if (!isValidObjectId(id)) throw new ApiError(404, "Menu item not found.");
  const item = await MenuItem.findById(id);
  if (!item || !item.isActive) throw new ApiError(404, "Menu item not found.");
  return item;
}

export async function createMenuItem(restaurantId: string, input: CreateMenuItemInput) {
  await getRestaurantById(restaurantId);

  // The category must exist AND belong to this restaurant — otherwise a dish
  // could be filed under another property's menu section.
  const category = await MenuCategory.findById(input.categoryId);
  if (!category || String(category.restaurantId) !== String(restaurantId)) {
    throw new ApiError(400, "That menu category does not belong to this restaurant.");
  }

  return MenuItem.create({ ...input, restaurantId });
}

export async function updateMenuItem(id: string, updates: Partial<CreateMenuItemInput>) {
  assertObjectId(id, "Menu item not found.");
  if (updates.categoryId) {
    const item = await getMenuItemById(id);
    const category = await MenuCategory.findById(updates.categoryId);
    if (!category || String(category.restaurantId) !== String(item.restaurantId)) {
      throw new ApiError(400, "That menu category does not belong to this restaurant.");
    }
  }
  const item = await MenuItem.findByIdAndUpdate(id, updates, { new: true });
  if (!item) throw new ApiError(404, "Menu item not found.");
  return item;
}

export async function deleteMenuItem(id: string) {
  assertObjectId(id, "Menu item not found.");
  const item = await MenuItem.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!item) throw new ApiError(404, "Menu item not found.");
  return item;
}

/**
 * The public menu query — backs menu search, veg/non-veg filters, price filters,
 * Chef Specials and Today's Special from one place.
 *
 * Search uses a regex rather than the model's text index when combined with other
 * filters, because MongoDB cannot combine `$text` with a `$sort` on another field
 * and still use the index efficiently. For a single restaurant's menu (tens to a
 * few hundred documents) an anchored case-insensitive regex is comfortably fast,
 * and it supports partial-word matching, which guests actually expect when typing
 * "pane" for "Paneer". The text index remains on the model for future use.
 */
export async function listMenuItems(restaurantId: string, filters: MenuQueryInput = {}) {
  const query: Record<string, unknown> = { restaurantId, isActive: true };

  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.foodType) query.foodType = filters.foodType;
  if (filters.chefSpecial) query.isChefSpecial = true;
  if (filters.todaysSpecial) query.isTodaysSpecial = true;

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (filters.minPrice !== undefined) price.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) price.$lte = filters.maxPrice;
    query.price = price;
  }

  if (filters.search?.trim()) {
    // Escape regex metacharacters so a guest typing "(" can't break the query.
    const safe = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    query.$or = [{ name: rx }, { description: rx }, { tags: rx }];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    name: { name: 1 },
    default: { displayOrder: 1, name: 1 },
  };

  return MenuItem.find(query).sort(sortMap[filters.sortBy || "default"]);
}

/** Chef Specials section. */
export async function getChefSpecials(restaurantId: string, limit = 6) {
  return MenuItem.find({ restaurantId, isActive: true, isChefSpecial: true, isAvailable: true })
    .sort({ displayOrder: 1 })
    .limit(limit);
}

/** Today's Special Menu section. */
export async function getTodaysSpecials(restaurantId: string, limit = 6) {
  return MenuItem.find({ restaurantId, isActive: true, isTodaysSpecial: true, isAvailable: true })
    .sort({ displayOrder: 1 })
    .limit(limit);
}

// ---------- DINING AREAS ----------

export async function listDiningAreas(restaurantId: string) {
  return DiningArea.find({ restaurantId, isActive: true }).sort({ areaType: 1, name: 1 });
}

export async function getDiningAreaById(id: string) {
  if (!isValidObjectId(id)) throw new ApiError(404, "Dining area not found.");
  const area = await DiningArea.findById(id);
  if (!area || !area.isActive) throw new ApiError(404, "Dining area not found.");
  return area;
}

export async function createDiningArea(restaurantId: string, input: CreateDiningAreaInput) {
  await getRestaurantById(restaurantId);
  const clash = await DiningArea.findOne({ restaurantId, slug: input.slug });
  if (clash) throw new ApiError(409, "A dining area with that slug already exists.");

  if (input.minPartySize && input.minPartySize > input.maxPartySize) {
    throw new ApiError(400, "minPartySize cannot exceed maxPartySize.");
  }
  return DiningArea.create({ ...input, restaurantId });
}

export async function updateDiningArea(id: string, updates: Partial<CreateDiningAreaInput>) {
  assertObjectId(id, "Dining area not found.");
  const area = await DiningArea.findByIdAndUpdate(id, updates, { new: true });
  if (!area) throw new ApiError(404, "Dining area not found.");
  return area;
}

export async function deleteDiningArea(id: string) {
  assertObjectId(id, "Dining area not found.");
  // Guard on FUTURE reservations only — past ones are history and must not block
  // an area being retired.
  const upcoming = await TableReservation.countDocuments({
    diningAreaId: id,
    status: { $in: ["confirmed", "seated"] },
    reservationDate: { $gte: startOfDayUTC(new Date()) },
  });
  if (upcoming > 0) {
    throw new ApiError(
      409,
      `Cannot delete a dining area with ${upcoming} upcoming reservation(s). Cancel or move them first.`
    );
  }
  const area = await DiningArea.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!area) throw new ApiError(404, "Dining area not found.");
  return area;
}

// ---------- AVAILABILITY ----------

/** Normalises to midnight UTC — the same convention RoomAvailability uses. */
export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * How many tables a party occupies in a given area.
 * A party of 10 in an area seating 4 per table needs 3 tables.
 */
export function tablesNeededFor(partySize: number, maxPartySizePerTable: number): number {
  return Math.max(1, Math.ceil(partySize / Math.max(1, maxPartySizePerTable)));
}

/** "19:30" → 1170. Returns NaN for anything that isn't HH:MM. */
export function slotToMinutes(timeSlot: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(timeSlot).trim());
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

const IST_OFFSET_MS = 330 * 60 * 1000; // Asia/Kolkata is UTC+05:30 with no DST.

/**
 * "Today" and "now" as the restaurant experiences them (Asia/Kolkata), expressed
 * in this module's date convention: the IST calendar date at midnight UTC, plus
 * minutes since IST midnight. Server time zone never matters.
 */
export function nowInIST(): { today: Date; minutes: number } {
  const shifted = new Date(Date.now() + IST_OFFSET_MS);
  return {
    today: startOfDayUTC(shifted),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** True when `timeSlot` on `day` has already started, judged in IST. */
export function isSlotInPast(day: Date, timeSlot: string): boolean {
  const { today, minutes } = nowInIST();
  const d = startOfDayUTC(day).getTime();
  if (d < today.getTime()) return true;
  if (d > today.getTime()) return false;
  const slot = slotToMinutes(timeSlot);
  return !Number.isNaN(slot) && slot <= minutes;
}

/**
 * Bookable tables for an area at a date+slot.
 *
 *   totalTables − manualBlocks(day-wide + slot-specific) − overlappingReservations
 *
 * A reservation holds its tables for the restaurant's `reservationDurationMinutes`
 * (default 90), so a 19:00 party still occupies its table at 19:30. Any active
 * reservation whose sitting `[start, start + duration)` overlaps this slot's
 * `[slot, slot + duration)` counts against it.
 *
 * Computed on read, exactly as the Hotel module computes room availability. Only
 * `confirmed` and `seated` reservations consume capacity — cancelled, completed
 * and no-show do not.
 *
 * `durationMinutes` may be passed by callers that already hold the restaurant
 * (the day grid) to save a lookup per slot.
 */
export async function getAvailableTables(
  diningAreaId: string,
  date: Date,
  timeSlot: string,
  durationMinutes?: number
): Promise<number> {
  const area = await getDiningAreaById(diningAreaId);
  const day = startOfDayUTC(date);

  let duration = durationMinutes;
  if (!duration) {
    const restaurant = await Restaurant.findById(area.restaurantId)
      .select("reservationDurationMinutes")
      .lean();
    duration = restaurant?.reservationDurationMinutes || 90;
  }

  // A day-wide override has no timeSlot; a slot override matches this slot.
  // Both count, so a closed day plus a blocked slot sum together.
  const overrides = await TableAvailability.find({
    diningAreaId,
    date: day,
    $or: [{ timeSlot: { $exists: false } }, { timeSlot: null }, { timeSlot }],
  });
  const blocked = overrides.reduce((sum, o) => sum + o.blockedTables, 0);

  // One area's active reservations for one day is a handful of rows, so the
  // overlap test runs here rather than as string arithmetic in an aggregation.
  const sameDay = await TableReservation.find({
    diningAreaId: area._id,
    reservationDate: day,
    status: { $in: ["confirmed", "seated"] },
  })
    .select("timeSlot tablesReserved")
    .lean();

  const slotStart = slotToMinutes(timeSlot);
  const reservedTables = sameDay.reduce((sum, r) => {
    const start = slotToMinutes(r.timeSlot);
    // Unparseable legacy data: fall back to the old exact-slot rule.
    const overlaps =
      Number.isNaN(start) || Number.isNaN(slotStart)
        ? r.timeSlot === timeSlot
        : start < slotStart + duration! && slotStart < start + duration!;
    return overlaps ? sum + r.tablesReserved : sum;
  }, 0);

  return Math.max(0, area.totalTables - blocked - reservedTables);
}

/**
 * Availability across every slot for a date — powers the "Table Availability"
 * view, so a guest sees which sittings are open rather than guessing one at a time.
 */
export async function getDayAvailability(
  restaurantId: string,
  date: Date,
  partySize?: number
): Promise<
  {
    diningAreaId: string;
    diningAreaName: string;
    areaType: string;
    slots: { timeSlot: string; availableTables: number; canSeatParty: boolean }[];
  }[]
> {
  const restaurant = await getRestaurantById(restaurantId);
  const areas = await listDiningAreas(restaurantId);
  const slots = restaurant.reservationSlots;
  const duration = restaurant.reservationDurationMinutes || 90;

  return Promise.all(
    areas.map(async (area) => {
      const needed = partySize ? tablesNeededFor(partySize, area.maxPartySize) : 1;
      const partyFitsArea =
        !partySize || (partySize >= area.minPartySize && partySize <= restaurant.maxPartySize);

      const slotResults = await Promise.all(
        slots.map(async (timeSlot) => {
          const availableTables = await getAvailableTables(
            String(area._id),
            date,
            timeSlot,
            duration
          );
          return {
            timeSlot,
            availableTables,
            // A sitting that has already started today can't be reserved.
            canSeatParty:
              partyFitsArea && availableTables >= needed && !isSlotInPast(date, timeSlot),
          };
        })
      );

      return {
        diningAreaId: String(area._id),
        diningAreaName: area.name,
        areaType: area.areaType,
        slots: slotResults,
      };
    })
  );
}

// ---------- ADMIN AVAILABILITY OVERRIDES ----------

export async function setTableAvailability(
  diningAreaId: string,
  input: { date: string; timeSlot?: string; blockedTables: number; reason?: string }
) {
  const area = await getDiningAreaById(diningAreaId);
  if (input.blockedTables > area.totalTables) {
    throw new ApiError(
      400,
      `Cannot block ${input.blockedTables} tables — this area only has ${area.totalTables}.`
    );
  }

  const day = startOfDayUTC(new Date(input.date));
  return TableAvailability.findOneAndUpdate(
    { diningAreaId, date: day, timeSlot: input.timeSlot ?? null },
    { diningAreaId, date: day, timeSlot: input.timeSlot ?? null, blockedTables: input.blockedTables, reason: input.reason },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function listTableAvailability(diningAreaId: string) {
  assertObjectId(diningAreaId, "Dining area not found.");
  return TableAvailability.find({ diningAreaId }).sort({ date: 1, timeSlot: 1 });
}
