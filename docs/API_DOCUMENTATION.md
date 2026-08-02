# API_DOCUMENTATION.md — 7 Vachan

**Base URL (dev):** `http://localhost:5000/api/v1`
**Versioning:** Path-based (`/api/v1/...`). Breaking changes get a new version prefix, per `AI_INSTRUCTIONS.md`.
**Auth header (protected routes):** `Authorization: Bearer <token>`
**Response envelope:** `{ success: boolean, message?: string, data?: ..., errors?: [...] }`

---

## Health

### `GET /api/v1/health`
No auth. Returns service status.
**Response 200:**
```json
{ "status": "ok", "service": "7vachan-backend", "timestamp": "2026-07-25T06:51:25.780Z" }
```

---

## Auth — User

### `POST /api/v1/auth/user/signup`
Public. Rate-limited (20 req / 15 min per IP).
**Body:**
```json
{ "name": "Jane Doe", "email": "jane@example.com", "phone": "9876543210", "password": "Password123" }
```
- `password` must be ≥8 chars, ≥1 uppercase, ≥1 number.
**Response 201:**
```json
{ "success": true, "message": "Account created. Please check your email to verify your account.", "data": { "id": "...", "name": "Jane Doe", "email": "jane@example.com" } }
```
**Errors:** `400` validation failure · `409` email already registered

### `GET /api/v1/auth/user/verify-email/:token`
Public. `:token` is the raw token from the verification email link.
**Response 200:** `{ "success": true, "message": "Email verified successfully." }`
**Errors:** `400` invalid/expired token

### `POST /api/v1/auth/user/login`
Public. Rate-limited.
**Body:** `{ "email": "jane@example.com", "password": "Password123" }`
**Response 200:**
```json
{ "success": true, "message": "Login successful.", "data": { "token": "<jwt>", "user": { "id": "...", "name": "...", "email": "...", "role": "user", "isEmailVerified": false } } }
```
**Errors:** `400` validation · `401` invalid credentials

### `POST /api/v1/auth/user/forgot-password`
Public. Rate-limited. Always returns a generic success message (prevents email enumeration).
**Body:** `{ "email": "jane@example.com" }`
**Response 200:** `{ "success": true, "message": "If an account with that email exists, a reset link has been sent." }`

### `POST /api/v1/auth/user/reset-password/:token`
Public. Rate-limited. `:token` is the raw token from the reset email link.
**Body:** `{ "password": "NewPassword123" }`
**Response 200:** `{ "success": true, "message": "Password has been reset successfully." }`
**Errors:** `400` invalid/expired token or validation failure

### `GET /api/v1/auth/user/me`
Protected (User JWT required).
**Response 200:** `{ "success": true, "data": { "id": "...", "role": "user", "actorType": "user" } }`
**Errors:** `401` missing/invalid/expired token

---

## Auth — Admin

> No public admin signup endpoint exists. Admin accounts are provisioned internally (future Admin Management module).

### `POST /api/v1/auth/admin/login`
Public. Rate-limited.
**Body:** `{ "email": "admin@7vachan.com", "password": "AdminPass123" }`
**Response 200:**
```json
{ "success": true, "message": "Login successful.", "data": { "token": "<jwt>", "admin": { "id": "...", "name": "...", "email": "...", "role": "super_admin", "branchId": null } } }
```
**Errors:** `400` validation · `401` invalid credentials or inactive account

### `POST /api/v1/auth/admin/forgot-password`
Public. Rate-limited. Generic response, same as user version.
**Body:** `{ "email": "admin@7vachan.com" }`

### `POST /api/v1/auth/admin/reset-password/:token`
Public. Rate-limited.
**Body:** `{ "password": "NewAdminPass123" }`

### `GET /api/v1/auth/admin/me`
Protected (Admin JWT required).
**Response 200:** `{ "success": true, "data": { "id": "...", "role": "super_admin", "actorType": "admin" } }`

---

## Error Response Shape (all endpoints)
```json
{ "success": false, "message": "Human readable message" }
```
Validation errors additionally include:
```json
{ "success": false, "message": "Validation failed", "errors": [ { "field": "email", "message": "Invalid email address" } ] }
```

## Standard Status Codes Used
`200` OK · `201` Created · `400` Validation error · `401` Unauthorized · `403` Forbidden (role mismatch) · `404` Route not found · `409` Conflict (duplicate) · `500` Internal server error

## Middleware Reference (for future modules building on this)
- `authenticate('user' | 'admin')` — verifies JWT with the correct secret for that actor type, attaches `req.actor = { id, role, actorType }`.
- `optionalAuthenticate('user' | 'admin')` — same as above but never rejects; used for guest-checkout flows (e.g. hotel booking) where login is optional.
- `requireRole(...roles)` — use after `authenticate()`; 403s if `req.actor.role` isn't in the allowed list. Example: `requireRole('super_admin', 'branch_admin')`.

---

## Hotel — Public

### `GET /api/v1/hotels`
No auth. Query param `branchId` optional. Returns active hotels.

### `GET /api/v1/hotels/:slug`
No auth. Returns aggregated hotel detail: `{ hotel, rooms, gallery, faqs, offers, reviewSummary, reviews }`.

### `GET /api/v1/hotels/:slug/rooms`
No auth. Lists active rooms for a hotel.

### `GET /api/v1/hotels/:slug/rooms/:roomSlug`
No auth. Returns `{ hotel, room }`.

### `GET /api/v1/hotels/rooms/:roomId/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD`
No auth. Returns `{ availableCount }` — minimum available units across every night in the range.

### `POST /api/v1/hotels/:hotelId/reviews`
Protected (User JWT required — guests cannot post reviews). Body: `{ rating: 1-5, comment }`. Review is created with `isApproved: false` pending admin moderation.

## Hotel — Booking (Public, guest checkout supported)

### `POST /api/v1/hotel-bookings`
Public. `optionalAuthenticate('user')` — if a valid User JWT is sent, the booking is linked to that account; otherwise it's a guest booking (per RULES.md — login is never forced).
**Body:**
```json
{ "hotelId": "...", "roomId": "...", "checkInDate": "2026-08-01", "checkOutDate": "2026-08-05", "numGuests": 2, "numRooms": 1, "guestName": "...", "guestEmail": "...", "guestPhone": "...", "specialRequest": "optional" }
```
Booking is created directly as `confirmed` (hotel bookings are instant per RULES.md — unlike Marriage Hall). Sends a confirmation email (dev-mode console log if SMTP unconfigured).
**Errors:** `400` validation/date logic · `409` insufficient availability

### `GET /api/v1/hotel-bookings/reference/:reference`
Public. Looks up a booking by its human-friendly reference (e.g. `7V-8F3A9C21`) — used by the confirmation page.

### `GET /api/v1/hotel-bookings/me`
Protected (User JWT required). Lists the logged-in user's own bookings.

## Hotel — Admin
All routes below require `authenticate('admin')`; most also require `requireRole('super_admin', 'branch_admin')` (noted per-route). Mounted at `/api/v1/admin/hotels`.

| Method & Path | Roles | Purpose |
|---|---|---|
| `POST /` | super_admin, branch_admin | Create hotel |
| `PUT /:hotelId` | super_admin, branch_admin | Update hotel |
| `DELETE /:hotelId` | super_admin, branch_admin | Soft-delete (deactivate) hotel — blocked if active rooms exist |
| `POST /:hotelId/rooms` | super_admin, branch_admin | Create room |
| `GET /rooms/:roomId` | super_admin, branch_admin, staff | Get a single room's full details (used by Edit Room form) |
| `PUT /rooms/:roomId` | super_admin, branch_admin | Update room |
| `DELETE /rooms/:roomId` | super_admin, branch_admin | Soft-delete room — blocked if active/upcoming bookings exist |
| `PUT /rooms/:roomId/availability` | super_admin, branch_admin | Set/override blocked-room-count for a specific date |
| `GET /rooms/:roomId/availability` | super_admin, branch_admin, staff | List availability overrides |
| `POST /upload-image?folder=` | super_admin, branch_admin | Upload an image to Cloudinary, returns `{ url, publicId, ... }` |
| `DELETE /upload-image` | super_admin, branch_admin | Delete an image from Cloudinary by `publicId` |
| `POST /:hotelId/gallery` | super_admin, branch_admin | Add gallery image |
| `DELETE /gallery/:itemId` | super_admin, branch_admin | Remove gallery image |
| `POST /:hotelId/offers` | super_admin, branch_admin | Create offer |
| `PUT /offers/:offerId` | super_admin, branch_admin | Update offer |
| `DELETE /offers/:offerId` | super_admin, branch_admin | Delete offer |
| `POST /:hotelId/faqs` | super_admin, branch_admin | Create FAQ |
| `DELETE /faqs/:faqId` | super_admin, branch_admin | Delete FAQ |
| `GET /bookings?hotelId=&status=` | super_admin, branch_admin, staff | List bookings (filterable) |
| `PUT /bookings/:bookingId/status` | super_admin, branch_admin | Update booking status (pending/confirmed/checked_in/checked_out/cancelled) |

### `POST /api/v1/admin/hotels/upload-image?folder=rooms`
Protected, `super_admin`/`branch_admin`. Multipart form-data, field name **`image`** (single file). `folder` query param is optional and namespaces the asset in Cloudinary (e.g. `rooms`, `gallery`, `offers`, `hotel-cover`) — defaults to `misc`.
Accepted types: JPEG, PNG, WEBP, AVIF. Max size: `MAX_IMAGE_UPLOAD_MB` env var (default 5MB).
**Response 201:**
```json
{ "success": true, "message": "Image uploaded.", "data": { "url": "https://res.cloudinary.com/.../room-1.jpg", "publicId": "7vachan/hotel/rooms/abc123", "width": 1600, "height": 1067, "format": "jpg", "bytes": 284213 } }
```
Use the returned `url` as the value for `imageUrl` (Gallery/Offer) or an entry in `images[]` (Room) in the existing create/update endpoints — those bodies are unchanged. Keep the `publicId` client-side if you want to allow deleting that image later.
**Errors:** `400` no file / disallowed type / oversized · `500` Cloudinary not configured on server · `502` upload failed

### `DELETE /api/v1/admin/hotels/upload-image`
Protected, `super_admin`/`branch_admin`. **Body:** `{ "publicId": "7vachan/hotel/rooms/abc123" }`.
**Response 200:** `{ "success": true, "message": "Image deleted." }`
**Errors:** `400` missing publicId · `500` Cloudinary not configured · `502` delete failed

### Validation Rules (Hotel/Room creation)
- `slug`: lowercase, alphanumeric + hyphens only, unique per hotel (rooms) / globally (hotels)
- Room `categoryName`: must be one of `Deluxe | Executive | Luxury | Suite`
- `basePrice`: positive number · `maxOccupancy`/`totalRooms`: positive integers

---

## Restaurant — Public

**Base:** `/api/v1/restaurants` · **Auth:** none unless stated.

`RULES.md` §2 governs this module: table reservation is **instant**, and online food ordering is **Phase 2** — so there is deliberately **no cart, order, checkout, delivery or payment endpoint anywhere below**.

### `GET /api/v1/restaurants`
List active restaurants. Optional `?branchId=<id>`.
**200:** `{ success, data: Restaurant[] }`

### `GET /api/v1/restaurants/:slug`
The page aggregate — one request renders the whole public restaurant page.
**200:** `{ success, data: { restaurant, menuCategories, menuItems, diningAreas, chefSpecials, todaysSpecials, gallery, faqs, offers, reviewSummary, reviews } }`
**Errors:** `404` restaurant not found

### `GET /api/v1/restaurants/:slug/menu`
Menu browse + search + filters. All query params optional.

| Param | Type | Notes |
|---|---|---|
| `search` | string | Case-insensitive partial match on name, description, tags |
| `categoryId` | string | Restrict to one menu section |
| `foodType` | `veg` / `non_veg` / `egg` | Veg / Non-Veg filter |
| `minPrice`, `maxPrice` | number | Price filter |
| `chefSpecial` | boolean | Chef Specials only |
| `todaysSpecial` | boolean | Today's Special only |
| `sortBy` | `price_asc` / `price_desc` / `name` / `default` | `default` = displayOrder |

**200:** `{ success, data: MenuItem[] }`
**Errors:** `400` validation, or "minPrice cannot be greater than maxPrice."

### `GET /api/v1/restaurants/:slug/menu/categories`
**200:** `{ success, data: MenuCategory[] }` — sorted by `displayOrder`.

### `GET /api/v1/restaurants/:slug/menu/chef-specials`
### `GET /api/v1/restaurants/:slug/menu/todays-specials`
**200:** `{ success, data: MenuItem[] }` — available items only, max 6.

### `GET /api/v1/restaurants/:slug/dining-areas`
Seating areas, including Private and Family dining (`areaType`).
**200:** `{ success, data: DiningArea[] }`

### `GET /api/v1/restaurants/:slug/availability`
The Table Availability grid — every area against every sitting for one date.

| Param | Required | Notes |
|---|---|---|
| `date` | yes | ISO date |
| `partySize` | no | Sets `canSeatParty` per slot |

**200:** `{ success, data: { date, slots: string[], areas: [{ diningAreaId, diningAreaName, areaType, slots: [{ timeSlot, availableTables, canSeatParty }] }] } }`

### `GET /api/v1/restaurants/dining-areas/:areaId/availability`
One area, one sitting. `date` and `timeSlot` required; `partySize` optional.
**200:** `{ success, data: { availableTables, tablesNeeded, canReserve } }`
**Errors:** `400` "timeSlot is required when checking a single dining area." · `404` dining area not found

### `POST /api/v1/restaurants/reviews/upload-image`
`multipart/form-data`, field `image`. Public — guests may review.
**201:** `{ success, data: { url, publicId } }`

### `POST /api/v1/restaurants/:restaurantId/reviews`
Optional auth. Logged in → the account name is used; guest → `guestName` required.
**Body:** `{ rating: 1-5, comment, guestName?, images? }` (max 5 images)
**201:** `{ success, message, data: Review }` — held until admin approval.

---

## Restaurant — Table Reservations (Public, guest checkout supported)

**Base:** `/api/v1/table-reservations`

### `POST /api/v1/table-reservations`
Creates a reservation **directly as `confirmed`** — instant, no approval step, and **no payment is taken**. Optional auth: a token links the reservation to the account; its absence is a guest reservation (`RULES.md` — never force login).

**Body:**
```json
{
  "restaurantId": "…",
  "diningAreaId": "…",
  "reservationDate": "2026-09-01",
  "timeSlot": "19:30",
  "partySize": 4,
  "guestName": "Arjit Gupta",
  "guestEmail": "arjit@example.com",
  "guestPhone": "9993542874",
  "specialRequest": "Window table",
  "occasion": "Anniversary"
}
```

**201:** `{ success, data: TableReservation }` — includes `reservationReference` (`7VR-XXXXXXXX`) and `tablesReserved`. A confirmation email is sent to the guest.

**Errors:**
- `400` validation · `timeSlot` not a configured sitting · past date · party below the area's minimum · party above the restaurant's `maxPartySize` (message directs the guest to call)
- `404` restaurant or dining area not found
- `409` restaurant closed that weekday · not enough free tables (message states how many are free)

### `GET /api/v1/table-reservations/reference/:reference`
Public lookup for the confirmation page.
**200:** `{ success, data: TableReservation }` · **404** not found

### `GET /api/v1/table-reservations/me`
**Requires user auth.** **200:** `{ success, data: TableReservation[] }`

### `PUT /api/v1/table-reservations/reference/:reference/cancel`
Optional auth. **Body:** `{ guestEmail?, cancellationReason? }`

Ownership must be proved — the reference alone is shareable. A guest supplies `guestEmail`; a logged-in owner is matched on `userId`. No refund logic: nothing was charged.

**200:** `{ success, data: TableReservation }` — status `cancelled`, tables released.
**Errors:** `400` no email and not logged in, or past reservation · `403` not the owner · `409` already cancelled, or already seated/completed/no-show

---

## Restaurant — Admin

**Base:** `/api/v1/admin/restaurants` · **All routes require admin auth.**
**Roles:** `super_admin` and `branch_admin` mutate. `staff` is read-only on menu items, dining areas, availability, reservations and reviews.

| Method | Path | Roles |
|---|---|---|
| POST | `/` | manager |
| PUT, DELETE | `/:restaurantId` | manager |
| POST, DELETE | `/upload-image` | manager |
| POST | `/:restaurantId/menu/categories` | manager |
| PUT, DELETE | `/menu/categories/:categoryId` | manager |
| POST | `/:restaurantId/menu/items` | manager |
| GET | `/menu/items/:itemId` | manager + staff |
| PUT, DELETE | `/menu/items/:itemId` | manager |
| POST | `/:restaurantId/dining-areas` | manager |
| GET | `/dining-areas/:areaId` | manager + staff |
| PUT, DELETE | `/dining-areas/:areaId` | manager |
| PUT | `/dining-areas/:areaId/availability` | manager |
| GET | `/dining-areas/:areaId/availability` | manager + staff |
| GET | `/reservations` | manager + staff |
| PUT | `/reservations/:reservationId/status` | manager |
| POST | `/:restaurantId/gallery` | manager |
| DELETE | `/gallery/:itemId` | manager |
| POST | `/:restaurantId/offers` | manager |
| PUT, DELETE | `/offers/:offerId` | manager |
| POST | `/:restaurantId/faqs` | manager |
| DELETE | `/faqs/:faqId` | manager |
| GET | `/:restaurantId/reviews` | manager + staff |
| PUT | `/reviews/:reviewId/approve` | manager |
| PUT | `/reviews/:reviewId/reply` | manager |
| DELETE | `/reviews/:reviewId` | manager |

### `PUT /api/v1/admin/restaurants/dining-areas/:areaId/availability`
Manual override (close Private Dining for an event, shut the terrace in rain).
**Body:** `{ date, timeSlot?, blockedTables, reason? }` — omit `timeSlot` to block the whole day.
**Errors:** `400` `blockedTables` exceeds the area's `totalTables`

### `GET /api/v1/admin/restaurants/reservations`
Optional `?restaurantId=`, `?status=`, `?date=`.

### `PUT /api/v1/admin/restaurants/reservations/:reservationId/status`
**Body:** `{ status }` where status is one of `confirmed`, `seated`, `completed`, `cancelled`, `no_show`.

### Soft-delete guards
- **Restaurant** — blocked while active dining areas exist
- **Menu category** — blocked while it holds active items
- **Dining area** — blocked while **upcoming** `confirmed`/`seated` reservations exist (past ones do not block)

### Availability model
Bookable tables are **computed on read**, never stored:

```
availableTables = totalTables
                − blockedTables (day-wide override + slot override)
                − sum of tablesReserved (status confirmed or seated)
```

A party occupies `ceil(partySize / area.maxPartySize)` tables. This mirrors the Hotel module's `RoomAvailability` design — only exceptions are stored, so no background job pre-generates rows.

**Known limitation (shared with Hotel):** the availability check and the reservation insert are not one transaction, so two simultaneous requests for the last table could both succeed. Deferred to the shared Booking Engine hardening item so both verticals get the same fix.

### Environment variables
No new variables. The module reuses `MONGODB_URI`, `JWT_SECRET`/`ADMIN_JWT_SECRET`, `SMTP_*`, `EMAIL_FROM`, `CLOUDINARY_*` and `ADMIN_NOTIFICATION_EMAIL` — all already required by the Auth and Hotel modules.

---

## Marriage Hall — Public
Mounted at `/api/v1/halls`. No authentication required.

| Method | Path | Purpose |
|---|---|---|
| GET | `/halls` | List active venues. Optional `?branchId=`. |
| GET | `/halls/:slug` | **The aggregate.** Returns `{ hall, packages, decorationThemes, catering, dining, floral, gallery, faqs, offers, reviewSummary, reviews }` — everything the landing page needs in one request. |
| GET | `/halls/:slug/packages` | Package tiers only. |
| GET | `/halls/:slug/showcase` | Showcase entries. Optional `?type=decoration\|catering\|dining\|floral` and `?category=`. |
| GET | `/halls/:slug/showcase/:type` | One section grouped by category → `{ showcaseType, categories, entries }`. |
| GET | `/halls/:slug/calendar` | Availability calendar. Required `?year=YYYY&month=1-12`, optional `?months=1-12`. Returns `{ from, to, days: [{ date: "YYYY-MM-DD", status }] }`. Internal block reasons are **stripped** on this route. |
| POST | `/halls/:hallId/reviews` | Create a review. `optionalAuthenticate("user")` — guests may review. Body `{ rating 1-5, comment, guestName?, images?[≤5] }`. Starts unapproved. |
| POST | `/halls/reviews/upload-image` | Review photo upload (multipart `image`). Public — guests review too. |

`status` on a calendar day is one of `available` · `tentative` · `booked` · `blocked`.

## Marriage Hall — Enquiries (Public, guest checkout supported)
Mounted at `/api/v1/hall-enquiries`.

> **These endpoints do not book anything.** Per `RULES.md` §14 a hall booking is approval-first: submitting an enquiry reserves no date and takes no payment. There is deliberately no amount, advance, Razorpay or invoice field anywhere in this group. The date is held only when an admin sets the enquiry to `confirmed`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/hall-enquiries` | Submit an enquiry. `optionalAuthenticate("user")`. Body `{ hallId, eventDate, alternateDate?, eventType, guestCount, packageId?, decorationThemeId?, cateringPreference?, budgetRange?, guestName, guestEmail, guestPhone, specialRequirements? }`. Returns a `7VH-XXXXXXXX` reference. |
| GET | `/hall-enquiries/reference/:reference` | Public lookup. `adminNotes` is **excluded**. |
| GET | `/hall-enquiries/me` | `authenticate("user")`. The signed-in user's enquiries. |
| PUT | `/hall-enquiries/reference/:reference/cancel` | Guest withdrawal. Body `{ guestEmail?, cancellationReason? }`. Ownership is proved by matching the enquiry email or the logged-in user — never by the reference alone. |

**Rejections on create:** `400` past date · `400` inside the venue's `minimumNoticeDays` window · `400` guest count above `floatingCapacity` · `409` the date is already booked or blocked.

**Cancellation rules:** `409` if already cancelled, `409` if already `confirmed` (the family must call), `403` if the email doesn't match.

## Marriage Hall — Admin
Mounted at `/api/v1/admin/halls`. All routes require `authenticate("admin")`.

**RBAC.** `HALL_MANAGER_ROLES = ["super_admin", "branch_admin", "hall_manager"]`. `hall_manager` is a **new role**, added additively to the Admin model's enum. Because Hotel and Restaurant list their managers explicitly as `["super_admin","branch_admin"]`, a `hall_manager` token is refused by those modules automatically — no new middleware was needed. `staff` gets the read-only additions marked below.

| Method | Path | Roles |
|---|---|---|
| POST | `/admin/halls` | manager |
| GET | `/admin/halls/:hallId` | manager + staff |
| PUT | `/admin/halls/:hallId` | manager |
| DELETE | `/admin/halls/:hallId` | manager — soft delete, **refused (409)** while open enquiries exist |
| POST/DELETE | `/admin/halls/upload-image` | manager (multipart `image`, `?folder=`) |
| GET | `/admin/halls/enquiries/list` | manager + staff — optional `?hallId=&status=&date=` |
| PUT | `/admin/halls/enquiries/:enquiryId/status` | manager — body `{ status, adminNotes? }` |
| POST | `/admin/halls/:hallId/packages` | manager |
| GET/PUT/DELETE | `/admin/halls/packages/:packageId` | GET manager + staff; PUT/DELETE manager |
| GET/POST | `/admin/halls/:hallId/showcase` | GET manager + staff; POST manager |
| GET/PUT/DELETE | `/admin/halls/showcase/:showcaseId` | GET manager + staff; PUT/DELETE manager |
| GET | `/admin/halls/:hallId/calendar` | manager + staff — same query as the public route, but **includes** block reasons |
| PUT | `/admin/halls/:hallId/availability` | manager — body `{ date, status, reason? }` |
| GET | `/admin/halls/:hallId/availability` | manager + staff — raw override rows |
| POST | `/admin/halls/:hallId/gallery` · DELETE `/admin/halls/gallery/:itemId` | manager |
| POST | `/admin/halls/:hallId/offers` · PUT/DELETE `/admin/halls/offers/:offerId` | manager |
| POST | `/admin/halls/:hallId/faqs` · DELETE `/admin/halls/faqs/:faqId` | manager |
| GET | `/admin/halls/:hallId/reviews` | manager + staff |
| PUT | `/admin/halls/reviews/:reviewId/approve` · `/reply` | manager |
| DELETE | `/admin/halls/reviews/:reviewId` · `/reviews/:reviewId/images` | manager |

### Enquiry status lifecycle
```
pending → reviewing → approved → confirmed
                   ↘ declined
(any)  → cancelled                (guest-initiated withdrawal)
```

**`approved` ≠ `confirmed`, and the difference matters.** `approved` means the venue is willing and the offline conversation has started; the date stays *tentative* on the public calendar because several families can be discussing the same auspicious date. `confirmed` is the only status that writes a `booked` override onto the calendar — and moving away from `confirmed` releases it again, but only if that override was created by this enquiry (a hand-placed staff block on the same day is never silently removed).

Guests are emailed on `approved`, `confirmed` and `declined` only. There is no email for `reviewing` — it means nothing to them.

### Availability model
`HallAvailability` stores **manual overrides only**, exactly as `RoomAvailability` and `TableAvailability` do. A day's public status is computed on read:

```
override (blocked/booked/tentative/available)   — always wins
else confirmed enquiry on that date             → booked
else pending or reviewing enquiry               → tentative
else                                            → available
```

Setting a date back to `available` **deletes** the row rather than storing an "available" marker, so an empty collection genuinely means "nothing is held". No pre-generation job exists.

### Showcase model
Decoration themes, catering, dining and floral all live in one `HallShowcase` collection keyed by `showcaseType`, with `category` sub-grouping within each. They are the same shape — a titled, illustrated, ordered card — so four near-identical models, services and route groups were not written. Type-specific fields (`colorPalette` and `beforeImageUrl` for decoration, `sampleItems` for catering) are optional columns rather than a loose `Mixed` bag, so they stay validated.

### Pricing — deliberately absent
There is **no numeric price field anywhere in this module**. `HallPackage.priceLabel` is a free-text string defaulting to `"On request"`, because the owner has not set pricing and the eventual model may be per-plate rather than per-event. Catering carries no price at all — it is showcase content, with no cart, order or quote endpoint. Do not add one without a `RULES.md` change.

### Environment variables
No new variables. The module reuses `MONGODB_URI`, `JWT_SECRET`/`ADMIN_JWT_SECRET`, `SMTP_*`, `EMAIL_FROM`, `CLOUDINARY_*` and `ADMIN_NOTIFICATION_EMAIL`.
