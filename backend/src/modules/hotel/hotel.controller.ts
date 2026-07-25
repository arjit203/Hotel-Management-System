import { Request, Response, NextFunction } from "express";
import * as hotelService from "./hotel.service";
import * as bookingService from "./booking.service";
import * as contentService from "../content/content.service";
import {
  createHotelSchema,
  updateHotelSchema,
  createRoomSchema,
  updateRoomSchema,
  setAvailabilitySchema,
  availabilityQuerySchema,
  createBookingSchema,
  createReviewSchema,
} from "./hotel.validation";

function handleZodError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.errors?.map((e: any) => ({ field: e.path.join("."), message: e.message })),
  });
}

// ================== PUBLIC: HOTEL ==================

export async function listHotels(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId as string | undefined;
    const hotels = await hotelService.listHotels({ branchId });
    res.status(200).json({ success: true, data: hotels });
  } catch (err) {
    next(err);
  }
}

export async function getHotelDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const hotel = await hotelService.getHotelBySlug(req.params.slug);
    const [rooms, gallery, faqs, offers, reviewSummary, reviews] = await Promise.all([
      hotelService.listRoomsForHotel(String(hotel._id)),
      contentService.getGallery("hotel", String(hotel._id)),
      contentService.getFaqs("hotel", String(hotel._id)),
      contentService.getActiveOffers("hotel", String(hotel._id)),
      contentService.getReviewSummary("hotel", String(hotel._id)),
      contentService.getApprovedReviews("hotel", String(hotel._id)),
    ]);

    res.status(200).json({
      success: true,
      data: { hotel, rooms, gallery, faqs, offers, reviewSummary, reviews },
    });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: ROOMS ==================

export async function listRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const hotel = await hotelService.getHotelBySlug(req.params.slug);
    const rooms = await hotelService.listRoomsForHotel(String(hotel._id));
    res.status(200).json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
}

export async function getRoomDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const hotel = await hotelService.getHotelBySlug(req.params.slug);
    const room = await hotelService.getRoomBySlug(String(hotel._id), req.params.roomSlug);
    res.status(200).json({ success: true, data: { hotel, room } });
  } catch (err) {
    next(err);
  }
}

export async function checkRoomAvailability(req: Request, res: Response, next: NextFunction) {
  const parsed = availabilityQuerySchema.safeParse(req.query);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const availableCount = await hotelService.getAvailableCount(
      req.params.roomId,
      new Date(parsed.data.checkIn),
      new Date(parsed.data.checkOut)
    );
    res.status(200).json({ success: true, data: { availableCount } });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: REVIEWS ==================

export async function createHotelReview(req: Request, res: Response, next: NextFunction) {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const actor = (req as any).actor; // set by authenticate('user') middleware on this route
    const review = await contentService.createReview({
      userId: actor?.id,
      reviewableType: "hotel",
      reviewableId: req.params.hotelId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    res.status(201).json({
      success: true,
      message: "Review submitted. It will appear after admin approval.",
      data: review,
    });
  } catch (err) {
    next(err);
  }
}

// ================== PUBLIC: BOOKING ==================

export async function createBooking(req: Request, res: Response, next: NextFunction) {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const actor = (req as any).actor; // optional — set only if a user JWT was provided
    const booking = await bookingService.createHotelBooking(parsed.data, actor?.id);
    res.status(201).json({
      success: true,
      message: "Booking confirmed successfully.",
      data: booking,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBookingByReference(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.getBookingByReference(req.params.reference);
    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = (req as any).actor;
    const bookings = await bookingService.getBookingsForUser(actor.id);
    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: HOTEL ==================

export async function adminCreateHotel(req: Request, res: Response, next: NextFunction) {
  const parsed = createHotelSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const hotel = await hotelService.createHotel(parsed.data);
    res.status(201).json({ success: true, message: "Hotel created.", data: hotel });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateHotel(req: Request, res: Response, next: NextFunction) {
  const parsed = updateHotelSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const hotel = await hotelService.updateHotel(req.params.hotelId, parsed.data);
    res.status(200).json({ success: true, message: "Hotel updated.", data: hotel });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteHotel(req: Request, res: Response, next: NextFunction) {
  try {
    await hotelService.deleteHotel(req.params.hotelId);
    res.status(200).json({ success: true, message: "Hotel deactivated." });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: ROOMS ==================

export async function adminCreateRoom(req: Request, res: Response, next: NextFunction) {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const room = await hotelService.createRoom(req.params.hotelId, parsed.data);
    res.status(201).json({ success: true, message: "Room created.", data: room });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateRoom(req: Request, res: Response, next: NextFunction) {
  const parsed = updateRoomSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const room = await hotelService.updateRoom(req.params.roomId, parsed.data);
    res.status(200).json({ success: true, message: "Room updated.", data: room });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteRoom(req: Request, res: Response, next: NextFunction) {
  try {
    await hotelService.deleteRoom(req.params.roomId);
    res.status(200).json({ success: true, message: "Room deactivated." });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: AVAILABILITY ==================

export async function adminSetAvailability(req: Request, res: Response, next: NextFunction) {
  const parsed = setAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const override = await hotelService.setAvailabilityOverride(
      req.params.roomId,
      new Date(parsed.data.date),
      parsed.data.blockedCount,
      parsed.data.reason
    );
    res.status(200).json({ success: true, message: "Availability updated.", data: override });
  } catch (err) {
    next(err);
  }
}

export async function adminListAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const overrides = await hotelService.listAvailabilityOverrides(req.params.roomId);
    res.status(200).json({ success: true, data: overrides });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: GALLERY ==================

export async function adminAddGalleryItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, title, imageUrl, displayOrder } = req.body;
    if (!category || !imageUrl) {
      return res.status(400).json({ success: false, message: "category and imageUrl are required." });
    }
    const item = await contentService.addGalleryItem({
      ownerType: "hotel",
      ownerId: req.params.hotelId,
      category,
      title,
      imageUrl,
      displayOrder,
    });
    res.status(201).json({ success: true, message: "Gallery item added.", data: item });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteGalleryItem(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteGalleryItem(req.params.itemId);
    res.status(200).json({ success: true, message: "Gallery item deleted." });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: OFFERS ==================

export async function adminCreateOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, description, imageUrl, validFrom, validTo } = req.body;
    if (!title || !validFrom || !validTo) {
      return res
        .status(400)
        .json({ success: false, message: "title, validFrom and validTo are required." });
    }
    const offer = await contentService.createOffer({
      applicableTo: "hotel",
      ownerId: req.params.hotelId,
      title,
      description,
      imageUrl,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
    });
    res.status(201).json({ success: true, message: "Offer created.", data: offer });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const offer = await contentService.updateOffer(req.params.offerId, req.body);
    res.status(200).json({ success: true, message: "Offer updated.", data: offer });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteOffer(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteOffer(req.params.offerId);
    res.status(200).json({ success: true, message: "Offer deleted." });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: FAQS ==================

export async function adminCreateFaq(req: Request, res: Response, next: NextFunction) {
  try {
    const { question, answer, displayOrder } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ success: false, message: "question and answer are required." });
    }
    const faq = await contentService.createFaq({
      applicableTo: "hotel",
      ownerId: req.params.hotelId,
      question,
      answer,
      displayOrder,
    });
    res.status(201).json({ success: true, message: "FAQ created.", data: faq });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteFaq(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteFaq(req.params.faqId);
    res.status(200).json({ success: true, message: "FAQ deleted." });
  } catch (err) {
    next(err);
  }
}

// ================== ADMIN: BOOKINGS ==================

export async function adminListBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const hotelId = req.query.hotelId as string | undefined;
    const status = req.query.status as string | undefined;
    const bookings = await bookingService.listBookingsForAdmin({ hotelId, status });
    res.status(200).json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateBookingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const booking = await bookingService.updateBookingStatus(req.params.bookingId, status);
    res.status(200).json({ success: true, message: "Booking status updated.", data: booking });
  } catch (err) {
    next(err);
  }
}
