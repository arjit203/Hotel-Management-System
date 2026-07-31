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
