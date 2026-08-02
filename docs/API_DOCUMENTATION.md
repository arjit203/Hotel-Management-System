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
