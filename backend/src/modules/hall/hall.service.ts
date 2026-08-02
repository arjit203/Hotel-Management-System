import { Hall } from "./models/hall.model";
import { HallPackage } from "./models/hallPackage.model";
import { HallShowcase, HallShowcaseType } from "./models/hallShowcase.model";
import { HallAvailability, HallDateStatus } from "./models/hallAvailability.model";
import { HallEnquiry } from "./models/hallEnquiry.model";
import { ApiError } from "../../utils/apiError.util";
import {
  CreateHallInput,
  UpdateHallInput,
  CreateHallPackageInput,
  CreateHallShowcaseInput,
  ShowcaseQueryInput,
} from "./hall.validation";

/**
 * Marriage Hall content + availability service.
 *
 * Enquiry handling lives in `enquiry.service.ts`, mirroring how the Restaurant
 * module splits content from reservations.
 */

/**
 * Normalise to midnight UTC. A hall is booked for a whole calendar day, never a
 * time slot, so every date comparison in this module happens at day granularity
 * — the same convention `RoomAvailability` and `TableAvailability` use.
 */
export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// ============================================================
// HALL
// ============================================================

export async function listHalls(filters: { branchId?: string } = {}) {
  const query: Record<string, unknown> = { isActive: true };
  if (filters.branchId) query.branchId = filters.branchId;
  return Hall.find(query).sort({ createdAt: -1 });
}

export async function getHallBySlug(slug: string) {
  const hall = await Hall.findOne({ slug, isActive: true });
  if (!hall) throw new ApiError(404, "Marriage hall not found.");
  return hall;
}

export async function getHallById(id: string) {
  const hall = await Hall.findById(id);
  if (!hall || !hall.isActive) throw new ApiError(404, "Marriage hall not found.");
  return hall;
}

export async function createHall(input: CreateHallInput) {
  const existing = await Hall.findOne({ slug: input.slug });
  if (existing) throw new ApiError(409, "A marriage hall with that slug already exists.");
  return Hall.create(input);
}

export async function updateHall(id: string, updates: UpdateHallInput) {
  if (updates.slug) {
    const clash = await Hall.findOne({ slug: updates.slug, _id: { $ne: id } });
    if (clash) throw new ApiError(409, "Another marriage hall already uses that slug.");
  }
  const hall = await Hall.findByIdAndUpdate(id, updates, { new: true });
  if (!hall) throw new ApiError(404, "Marriage hall not found.");
  return hall;
}

/**
 * Soft delete, blocked while live enquiries exist — same guard style as
 * `deleteHotel` (which refuses while active rooms/bookings remain). Deleting a
 * hall out from under a family mid-conversation would strand the enquiry.
 */
export async function deleteHall(id: string) {
  const liveEnquiries = await HallEnquiry.countDocuments({
    hallId: id,
    status: { $in: ["pending", "reviewing", "approved", "confirmed"] },
  });
  if (liveEnquiries > 0) {
    throw new ApiError(
      409,
      `Cannot deactivate a hall with ${liveEnquiries} open enquiry/enquiries. Close or decline them first.`
    );
  }

  const hall = await Hall.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!hall) throw new ApiError(404, "Marriage hall not found.");
  return hall;
}

// ============================================================
// PACKAGES
// ============================================================

export async function listPackages(hallId: string) {
  return HallPackage.find({ hallId, isActive: true }).sort({ displayOrder: 1, name: 1 });
}

export async function getPackageById(id: string) {
  const pkg = await HallPackage.findById(id);
  if (!pkg || !pkg.isActive) throw new ApiError(404, "Package not found.");
  return pkg;
}

export async function createPackage(hallId: string, input: CreateHallPackageInput) {
  await getHallById(hallId);
  const clash = await HallPackage.findOne({ hallId, slug: input.slug });
  if (clash) throw new ApiError(409, "A package with that slug already exists for this hall.");

  if (
    input.suitableForMinGuests !== undefined &&
    input.suitableForMaxGuests !== undefined &&
    input.suitableForMinGuests > input.suitableForMaxGuests
  ) {
    throw new ApiError(400, "Minimum guest count cannot exceed the maximum.");
  }

  return HallPackage.create({ ...input, hallId });
}

export async function updatePackage(id: string, updates: Partial<CreateHallPackageInput>) {
  const pkg = await HallPackage.findByIdAndUpdate(id, updates, { new: true });
  if (!pkg) throw new ApiError(404, "Package not found.");
  return pkg;
}

export async function deletePackage(id: string) {
  const pkg = await HallPackage.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!pkg) throw new ApiError(404, "Package not found.");
  return pkg;
}

// ============================================================
// SHOWCASES — decoration / catering / dining / floral
// ============================================================

export async function listShowcases(hallId: string, filters: ShowcaseQueryInput = {}) {
  const query: Record<string, unknown> = { hallId, isActive: true };
  if (filters.type) query.showcaseType = filters.type;
  if (filters.category) query.category = filters.category;
  return HallShowcase.find(query).sort({ displayOrder: 1, title: 1 });
}

/** Groups one section's entries by category — what each showcase page renders. */
export async function getShowcaseSection(hallId: string, showcaseType: HallShowcaseType) {
  const entries = await HallShowcase.find({ hallId, showcaseType, isActive: true }).sort({
    displayOrder: 1,
    title: 1,
  });

  const categories = Array.from(new Set(entries.map((e) => e.category)));
  return { showcaseType, categories, entries };
}

export async function getShowcaseById(id: string) {
  const entry = await HallShowcase.findById(id);
  if (!entry || !entry.isActive) throw new ApiError(404, "Showcase entry not found.");
  return entry;
}

export async function createShowcase(hallId: string, input: CreateHallShowcaseInput) {
  await getHallById(hallId);
  return HallShowcase.create({ ...input, hallId });
}

export async function updateShowcase(id: string, updates: Partial<CreateHallShowcaseInput>) {
  const entry = await HallShowcase.findByIdAndUpdate(id, updates, { new: true });
  if (!entry) throw new ApiError(404, "Showcase entry not found.");
  return entry;
}

export async function deleteShowcase(id: string) {
  const entry = await HallShowcase.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!entry) throw new ApiError(404, "Showcase entry not found.");
  return entry;
}

// ============================================================
// AVAILABILITY CALENDAR
// ============================================================

export interface CalendarDay {
  /** YYYY-MM-DD, so the client never has to parse a timezone. */
  date: string;
  status: HallDateStatus;
  /** Present only for admin reads — the public route strips it. */
  reason?: string;
}

/**
 * Builds the public month calendar.
 *
 * Status precedence, highest first:
 *   1. an explicit admin override (`blocked` / `booked` / `tentative` / `available`)
 *   2. a `confirmed` enquiry on that date            → booked
 *   3. a `pending` or `reviewing` enquiry            → tentative
 *   4. otherwise                                     → available
 *
 * `approved` deliberately does NOT mark a date booked. Approval means the venue
 * is willing and the offline conversation has started; the date is only held
 * once an admin confirms. Several families can be in conversation about the same
 * auspicious date, and showing it as gone would lose the others.
 *
 * An admin override always wins, so staff can force a date open or shut
 * regardless of what the enquiries say.
 */
export async function getCalendar(
  hallId: string,
  year: number,
  /** 1-12, as a human would write it. */
  month: number,
  monthsToLoad = 1,
  includeReasons = false
): Promise<{ from: string; to: string; days: CalendarDay[] }> {
  await getHallById(hallId);

  const from = new Date(Date.UTC(year, month - 1, 1));
  // Day 0 of the month after the range = the last day of the range.
  const to = new Date(Date.UTC(year, month - 1 + monthsToLoad, 0));

  const [overrides, enquiries] = await Promise.all([
    HallAvailability.find({ hallId, date: { $gte: from, $lte: to } }),
    HallEnquiry.find({
      hallId,
      eventDate: { $gte: from, $lte: to },
      status: { $in: ["pending", "reviewing", "confirmed"] },
    }).select("eventDate status"),
  ]);

  const overrideByDate = new Map<string, { status: HallDateStatus; reason?: string }>();
  for (const o of overrides) {
    overrideByDate.set(toDateKey(o.date), { status: o.status, reason: o.reason });
  }

  const enquiryStatusByDate = new Map<string, HallDateStatus>();
  for (const e of enquiries) {
    const key = toDateKey(e.eventDate);
    const derived: HallDateStatus = e.status === "confirmed" ? "booked" : "tentative";
    // A confirmed enquiry outranks a tentative one on the same date.
    if (derived === "booked" || !enquiryStatusByDate.has(key)) {
      enquiryStatusByDate.set(key, derived);
    }
  }

  const days: CalendarDay[] = [];
  for (
    let cursor = new Date(from);
    cursor <= to;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1))
  ) {
    const key = toDateKey(cursor);
    const override = overrideByDate.get(key);
    const status: HallDateStatus = override?.status ?? enquiryStatusByDate.get(key) ?? "available";

    days.push({
      date: key,
      status,
      ...(includeReasons && override?.reason ? { reason: override.reason } : {}),
    });
  }

  return { from: toDateKey(from), to: toDateKey(to), days };
}

function toDateKey(date: Date): string {
  return startOfDayUTC(new Date(date)).toISOString().slice(0, 10);
}

/**
 * Admin override for one date.
 *
 * Setting a date back to `available` deletes the row rather than storing an
 * "available" marker — the collection holds only genuine overrides, so an empty
 * collection means "nothing is blocked", which is what the calendar assumes.
 */
export async function setAvailability(
  hallId: string,
  input: { date: string; status: HallDateStatus; reason?: string }
) {
  await getHallById(hallId);
  const date = startOfDayUTC(new Date(input.date));

  if (input.status === "available") {
    await HallAvailability.findOneAndDelete({ hallId, date });
    return { hallId, date, status: "available" as const, cleared: true };
  }

  return HallAvailability.findOneAndUpdate(
    { hallId, date },
    { hallId, date, status: input.status, reason: input.reason },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function listAvailabilityOverrides(hallId: string) {
  return HallAvailability.find({ hallId }).sort({ date: 1 });
}

/** True when the date is free to enquire about. Used before accepting a form. */
export async function isDateOpenForEnquiry(hallId: string, date: Date): Promise<boolean> {
  const day = startOfDayUTC(date);

  const override = await HallAvailability.findOne({ hallId, date: day });
  if (override && (override.status === "booked" || override.status === "blocked")) return false;
  // An admin can force a date open even if an enquiry sits on it.
  if (override && override.status === "available") return true;

  const confirmed = await HallEnquiry.countDocuments({
    hallId,
    eventDate: day,
    status: "confirmed",
  });
  return confirmed === 0;
}
