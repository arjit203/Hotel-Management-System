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
- `requireRole(...roles)` — use after `authenticate()`; 403s if `req.actor.role` isn't in the allowed list. Example: `requireRole('super_admin', 'hotel_manager')`.

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
All routes below require `authenticate('admin')` **and** `requireRole(...HOTEL_MANAGER_ROLES)`, where `HOTEL_MANAGER_ROLES = ["super_admin", "hotel_manager"]`. Mounted at `/api/v1/admin/hotels`.

There is no read-only tier any more — a hotel manager reads and writes everything in Hotel, and nothing outside it.

| Method & Path | Roles | Purpose |
|---|---|---|
| `POST /` | hotel manager | Create hotel |
| `PUT /:hotelId` | hotel manager | Update hotel |
| `DELETE /:hotelId` | hotel manager | Soft-delete (deactivate) hotel — blocked if active rooms exist |
| `POST /:hotelId/rooms` | hotel manager | Create room |
| `GET /rooms/:roomId` | hotel manager | Get a single room's full details (used by Edit Room form) |
| `PUT /rooms/:roomId` | hotel manager | Update room |
| `DELETE /rooms/:roomId` | hotel manager | Soft-delete room — blocked if active/upcoming bookings exist |
| `PUT /rooms/:roomId/availability` | hotel manager | Set/override blocked-room-count for a specific date |
| `GET /rooms/:roomId/availability` | hotel manager | List availability overrides |
| `POST /upload-image?folder=` | hotel manager | Upload an image to Cloudinary, returns `{ url, publicId, ... }` |
| `DELETE /upload-image` | hotel manager | Delete an image from Cloudinary by `publicId` |
| `POST /:hotelId/gallery` | hotel manager | Add gallery image |
| `DELETE /gallery/:itemId` | hotel manager | Remove gallery image |
| `POST /:hotelId/offers` | hotel manager | Create offer |
| `PUT /offers/:offerId` | hotel manager | Update offer |
| `DELETE /offers/:offerId` | hotel manager | Delete offer |
| `POST /:hotelId/faqs` | hotel manager | Create FAQ |
| `DELETE /faqs/:faqId` | hotel manager | Delete FAQ |
| `GET /bookings?hotelId=&status=` | hotel manager | List bookings (filterable) |
| `PUT /bookings/:bookingId/status` | hotel manager | Update booking status (pending/confirmed/checked_in/checked_out/cancelled) |

### `POST /api/v1/admin/hotels/upload-image?folder=rooms`
Protected, `HOTEL_MANAGER_ROLES`. Multipart form-data, field name **`image`** (single file). `folder` query param is optional and namespaces the asset in Cloudinary (e.g. `rooms`, `gallery`, `offers`, `hotel-cover`) — defaults to `misc`.
Accepted types: JPEG, PNG, WEBP, AVIF. Max size: `MAX_IMAGE_UPLOAD_MB` env var (default 5MB).
**Response 201:**
```json
{ "success": true, "message": "Image uploaded.", "data": { "url": "https://res.cloudinary.com/.../room-1.jpg", "publicId": "7vachan/hotel/rooms/abc123", "width": 1600, "height": 1067, "format": "jpg", "bytes": 284213 } }
```
Use the returned `url` as the value for `imageUrl` (Gallery/Offer) or an entry in `images[]` (Room) in the existing create/update endpoints — those bodies are unchanged. Keep the `publicId` client-side if you want to allow deleting that image later.
**Errors:** `400` no file / disallowed type / oversized · `500` Cloudinary not configured on server · `502` upload failed

### `DELETE /api/v1/admin/hotels/upload-image`
Protected, `HOTEL_MANAGER_ROLES`. **Body:** `{ "publicId": "7vachan/hotel/rooms/abc123" }`.
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
**Roles:** `RESTAURANT_MANAGER_ROLES = ["super_admin", "restaurant_manager"]` for every route below — read and write alike.

| Method | Path | Roles |
|---|---|---|
| POST | `/` | manager |
| PUT, DELETE | `/:restaurantId` | manager |
| POST, DELETE | `/upload-image` | manager |
| POST | `/:restaurantId/menu/categories` | manager |
| PUT, DELETE | `/menu/categories/:categoryId` | manager |
| POST | `/:restaurantId/menu/items` | manager |
| GET | `/menu/items/:itemId` | manager |
| PUT, DELETE | `/menu/items/:itemId` | manager |
| POST | `/:restaurantId/dining-areas` | manager |
| GET | `/dining-areas/:areaId` | manager |
| PUT, DELETE | `/dining-areas/:areaId` | manager |
| PUT | `/dining-areas/:areaId/availability` | manager |
| GET | `/dining-areas/:areaId/availability` | manager |
| GET | `/reservations` | manager |
| PUT | `/reservations/:reservationId/status` | manager |
| POST | `/:restaurantId/gallery` | manager |
| DELETE | `/gallery/:itemId` | manager |
| POST | `/:restaurantId/offers` | manager |
| PUT, DELETE | `/offers/:offerId` | manager |
| POST | `/:restaurantId/faqs` | manager |
| DELETE | `/faqs/:faqId` | manager |
| GET | `/:restaurantId/reviews` | manager |
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

**RBAC.** `HALL_MANAGER_ROLES = ["super_admin", "hall_manager"]`. Each module names its own managers, so a `hall_manager` token is refused by Hotel and Restaurant automatically — the isolation falls out of the existing `requireRole` pattern rather than needing new middleware.

| Method | Path | Roles |
|---|---|---|
| POST | `/admin/halls` | manager |
| GET | `/admin/halls/:hallId` | manager |
| PUT | `/admin/halls/:hallId` | manager |
| DELETE | `/admin/halls/:hallId` | manager — soft delete, **refused (409)** while open enquiries exist |
| POST/DELETE | `/admin/halls/upload-image` | manager (multipart `image`, `?folder=`) |
| GET | `/admin/halls/enquiries/list` | manager — optional `?hallId=&status=&date=` |
| PUT | `/admin/halls/enquiries/:enquiryId/status` | manager — body `{ status, adminNotes? }` |
| POST | `/admin/halls/:hallId/packages` | manager |
| GET/PUT/DELETE | `/admin/halls/packages/:packageId` | manager |
| GET/POST | `/admin/halls/:hallId/showcase` | manager |
| GET/PUT/DELETE | `/admin/halls/showcase/:showcaseId` | manager |
| GET | `/admin/halls/:hallId/calendar` | manager — same query as the public route, but **includes** block reasons |
| PUT | `/admin/halls/:hallId/availability` | manager — body `{ date, status, reason? }` |
| GET | `/admin/halls/:hallId/availability` | manager — raw override rows |
| POST | `/admin/halls/:hallId/gallery` · DELETE `/admin/halls/gallery/:itemId` | manager |
| POST | `/admin/halls/:hallId/offers` · PUT/DELETE `/admin/halls/offers/:offerId` | manager |
| POST | `/admin/halls/:hallId/faqs` · DELETE `/admin/halls/faqs/:faqId` | manager |
| GET | `/admin/halls/:hallId/reviews` | manager |
| PUT | `/admin/halls/reviews/:reviewId/approve` · `/reply` | manager |
| DELETE | `/admin/halls/reviews/:reviewId` · `/reviews/:reviewId/images` | manager |

### Enquiry status lifecycle
```
pending → reviewing → approved → confirmed
                   ↘ declined
(any)  → cancelled                (guest-initiated withdrawal)
```

**`approved` ≠ `confirmed`, and the difference matters.** `approved` means the venue is willing and the offline conversation has started; the date stays *tentative* on the public calendar because several families can be discussing the same auspicious date. `confirmed` is the only status that writes a `booked` override onto the calendar — and moving away from `confirmed` releases it again, but only if that override was created by this enquiry (a hand-placed manager block on the same day is never silently removed).

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

---

## Admin Users & Roles
Mounted at `/api/v1/admin/users`. **Super Admin only** — `authenticate("admin")` and `requireRole("super_admin")` are applied to the whole router, so every route in this group is guarded and adding one can never accidentally ship unprotected.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/users` | List accounts. Optional `?role=&isActive=true|false&search=`. Returns `effectiveScope` alongside the stored `businessScope`. |
| POST | `/admin/users` | Create. `{ name, email, password, role, branchId?, businessScope?, phone? }` |
| GET | `/admin/users/:adminId` | One account. |
| PUT | `/admin/users/:adminId` | Edit name / email / phone / role / branch / scope. **Never** takes a password. |
| PUT | `/admin/users/:adminId/status` | `{ isActive }` — activate or deactivate. |
| PUT | `/admin/users/:adminId/password` | `{ password }` — direct reset by a Super Admin. Not emailed. |
| DELETE | `/admin/users/:adminId` | Hard delete. Deactivation is preferred and keeps history. |

### Roles
There are exactly four:

| Role | Scope | Can |
|---|---|---|
| `super_admin` | Everything | All three verticals, plus these endpoints |
| `hotel_manager` | Hotel only | Rooms, availability, content, bookings |
| `restaurant_manager` | Restaurant only | Menu, dining areas, reservations, content |
| `hall_manager` | Marriage Hall only | Packages, showcases, calendar, enquiries |

Isolation is structural, not special-cased: each module names its allowed roles
explicitly (`HOTEL_MANAGER_ROLES`, `RESTAURANT_MANAGER_ROLES`,
`HALL_MANAGER_ROLES`), so a manager token is refused elsewhere by the same
`requireRole` check every route already used.

**`branch_admin` and `staff` were removed** at the owner's request. 7 Vachan will
run a single branch, which made a branch-scoped admin a second Super Admin under
another name; and a read-only tier had nobody to fill it, since a manager already
reads everything in their own vertical. Seventeen `requireRole(...X, "staff")`
read-guards collapsed to `requireRole(...X)`.

This removed the **roles**, not the multi-tenant **data model**. `branchId` stays
required on every non-Super-Admin account and on every property, because
`RULES.md` §26 freezes that requirement. Adding a second branch later means
reintroducing a role, not migrating data.

`businessScope` is now **derived entirely from the role** (`ROLE_IMPLIED_SCOPE`)
and stored only so the admin list can show one consistent column. It is accepted
in the request body but ignored, so an older admin-panel build that still sends
it gets a clean response instead of a validation error — and a client can never
grant itself a scope the route guards would refuse.

**Legacy rows.** An account created before the removal still carries the old role
string. `ROLE_IMPLIED_SCOPE[role]` is `undefined` for those, which would throw and
take the whole list endpoint down with a 500 — one stale document costing you the
screen you'd use to fix it. `effectiveScope()` guards for it, and both the list and
single-account responses carry `isLegacyRole: true` so the admin panel can flag the
row. A legacy account resolves to an empty scope, which is also the safe answer:
every `requireRole` list names the current roles explicitly, so it is already
refused everywhere.

### Business rules enforced server-side
- **Nobody can change their own role** — the classic way to lock yourself out of the screen you'd need to undo it.
- **Nobody can deactivate or delete themselves.**
- **The last active Super Admin is protected** from demotion, deactivation and deletion. Without this, an installation can reach a state where no account can create another — unrecoverable without database access.
- Every role except `super_admin` **must have a branch**; a branch-scoped role without one passes every branch check by having nothing to compare against. The admin panel prefills the only branch, so nobody types an ObjectId.
- Email uniqueness, and a minimum password length of 8.

### Permission changes take effect immediately
`authenticate("admin")` re-reads the account from the database on every admin request and uses the **live** role, rejecting deactivated accounts with 403.

Without this, a JWT carries the role it was signed with, so an admin demoted from `super_admin` to `hotel_manager` would keep full access until their token expired — up to seven days — and a deactivated account would keep working entirely.

Cost is one indexed `findById` per admin request. Admin traffic is a handful of people rather than the public, so that is a fair price for instant revocation. **User tokens are deliberately not re-checked**: that path is public-facing, far higher volume, and carries no privileged role to revoke.

**Verified live** against a scratch backend, after the role removal:

| Role | `/admin/hotels/bookings` | `/admin/restaurants/reservations` | `/admin/halls/enquiries/list` | `/admin/users` |
|---|---|---|---|---|
| `hotel_manager` | 200 | 403 | 403 | 403 |
| `restaurant_manager` | 403 | 200 | 403 | 403 |
| `hall_manager` | 403 | 403 | 200 | 403 |
| `super_admin` | 200 | 200 | 200 | 200 |

Also confirmed: creating `branch_admin` or `staff` is refused with a 400 enum
error on both create and update; a manager calling `POST /admin/users`, or trying
to raise their own role via `PUT`, gets 403; changing a role flipped the *same
unexpired token* from 200-on-hotel to 200-on-hall with no re-login; and
deactivating an account flipped that token to 403 immediately.

One trap worth recording, because it manufactures false passes: the admin routers
have **no bare `GET /`**, so probing `/admin/hotels` falls through to the global
404 *before* `requireRole` runs. A matrix built on those paths reads 404
everywhere and proves nothing. Likewise `adminUser.routes.ts` uses `PUT` (not
`PATCH`) and `/:adminId/password` (not `/reset-password`) — a wrong verb 404s, and
a 404 body has `success: false`, which reads as "correctly blocked" to any check
that only tests `success`. Assert on the status code, not the flag.

## Marriage Hall — availability range (added)
| Method | Path | Purpose |
|---|---|---|
| PUT | `/admin/halls/:hallId/availability/range` | `{ from, to, status, reason? }` — applies one status across an inclusive date range. Capped at 366 days. `available` deletes the overrides rather than storing markers, matching the single-date route. |

Written as one `bulkWrite`, so a 90-day block is a single round-trip rather than ninety.
