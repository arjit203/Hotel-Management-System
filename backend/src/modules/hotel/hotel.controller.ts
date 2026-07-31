import { Request, Response, NextFunction } from "express";
import * as hotelService from "./hotel.service";
import * as bookingService from "./booking.service";
import * as contentService from "../content/content.service";
import { User } from "../auth/models/user.model";
import { uploadImageBuffer, deleteImageByPublicId } from "../../utils/cloudinary.util";
import { ApiError } from "../../utils/apiError.util";
import {
  createHotelSchema,
  updateHotelSchema,
  createRoomSchema,
  updateRoomSchema,
  setAvailabilitySchema,
  availabilityQuerySchema,
  createBookingSchema,
  createReviewSchema,
  replyReviewSchema,
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
    const actor = (req as any).actor; // set by optionalAuthenticate('user') — may be undefined for guests
    let guestName = parsed.data.guestName;
    if (actor?.id) {
      // Logged-in user: prefer their account name over anything submitted client-side.
      const user = await User.findById(actor.id).select("name");
      guestName = user?.name || guestName;
    }
    if (!guestName) {
      throw new ApiError(400, "Please provide your name.");
    }
    const review = await contentService.createReview({
      userId: actor?.id,
      guestName,
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

// ================== ADMIN: REVIEWS ==================
// Reviews are shared/polymorphic (per content module), but exposed here under
// the Hotel admin namespace since only the Hotel vertical exists today —
// Hall/Restaurant admin routes can call the same contentService functions
// later without duplicating this logic.

export async function adminListReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await contentService.getAllReviewsForAdmin("hotel", req.params.hotelId);
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

export async function adminApproveReview(req: Request, res: Response, next: NextFunction) {
  try {
    const review = await contentService.approveReview(req.params.reviewId);
    res.status(200).json({ success: true, message: "Review approved.", data: review });
  } catch (err) {
    next(err);
  }
}

export async function adminReplyToReview(req: Request, res: Response, next: NextFunction) {
  const parsed = replyReviewSchema.safeParse(req.body);
  if (!parsed.success) return handleZodError(res, parsed.error);

  try {
    const review = await contentService.replyToReview(req.params.reviewId, parsed.data.reply);
    res.status(200).json({ success: true, message: "Reply saved.", data: review });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteReview(req: Request, res: Response, next: NextFunction) {
  try {
    await contentService.deleteReview(req.params.reviewId);
    res.status(200).json({ success: true, message: "Review deleted." });
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

// Fetch a single room by ID — used by the admin panel's "Edit Room" form to
// pre-fill current values. hotelService.getRoomById already existed (used
// internally elsewhere) but had no controller/route exposing it; this is a
// pure wiring addition, no service-layer logic changed.
export async function adminGetRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await hotelService.getRoomById(req.params.roomId);
    res.status(200).json({ success: true, data: room });
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

// ================== ADMIN: MEDIA (CLOUDINARY) ==================
// Generic image upload used by Hotel/Room/Gallery/Offer admin forms.
// Flow: admin uploads a file here first, gets back { url, publicId }, then
// sends that `url` string in the existing create/update Hotel/Room/Gallery/
// Offer request bodies (those endpoints are unchanged — they already accept
// imageUrl/images as plain strings, see hotel.model.ts / room.model.ts /
// gallery.model.ts / offer.model.ts).

export async function adminUploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided (field name: 'image')." });
    }
    // folder query param lets the admin panel namespace the asset, e.g.
    // ?folder=rooms | gallery | offers | hotel-cover. Falls back to "misc".
    const folder = `7vachan/hotel/${(req.query.folder as string) || "misc"}`;
    const result = await uploadImageBuffer(file.buffer, folder);
    res.status(201).json({ success: true, message: "Image uploaded.", data: result });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      throw new ApiError(400, "publicId is required.");
    }
    await deleteImageByPublicId(publicId);
    res.status(200).json({ success: true, message: "Image deleted." });
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
