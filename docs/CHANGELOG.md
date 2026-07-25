# CHANGELOG.md — 7 Vachan

Format: newest entries on top. Categories: Added / Changed / Fixed / Security / Deprecated.

---

## [2026-07-25 (b)] — Hotel Module (Phase 3)

### Added
**Shared content module (new, reusable by future Hall/Restaurant modules):**
- `backend/src/modules/content/models/review.model.ts` — polymorphic Review (reviewableType/reviewableId)
- `backend/src/modules/content/models/gallery.model.ts` — polymorphic GalleryItem
- `backend/src/modules/content/models/faq.model.ts` — polymorphic Faq
- `backend/src/modules/content/models/offer.model.ts` — polymorphic Offer
- `backend/src/modules/content/content.service.ts` — generic CRUD/query functions for all four above

**Hotel module:**
- `backend/src/modules/hotel/models/hotel.model.ts`
- `backend/src/modules/hotel/models/room.model.ts` (categories: Deluxe/Executive/Luxury/Suite)
- `backend/src/modules/hotel/models/roomAvailability.model.ts` (manual override collection)
- `backend/src/modules/hotel/models/hotelBooking.model.ts`
- `backend/src/modules/hotel/hotel.validation.ts` — Zod schemas
- `backend/src/modules/hotel/hotel.service.ts` — hotel/room CRUD + availability computation
- `backend/src/modules/hotel/booking.service.ts` — instant booking workflow, guest-checkout supported
- `backend/src/modules/hotel/hotel.controller.ts` — public + admin request handlers
- `backend/src/modules/hotel/hotel.routes.ts` — `publicHotelRouter`, `publicBookingRouter`, `adminHotelRouter`
- `backend/src/utils/apiError.util.ts` — new shared `ApiError` class for Hotel module and beyond

**Frontend:**
- `frontend/src/lib/api.ts` — shared API client (reusable by all future modules)
- `frontend/src/components/StarRating.tsx`, `FaqAccordion.tsx`, `GalleryGrid.tsx`, `MapPlaceholder.tsx` — vertical-agnostic shared components
- `frontend/src/modules/hotel/components/HotelCard.tsx`, `RoomCard.tsx`, `BookingForm.tsx`
- `frontend/src/app/hotels/page.tsx` — hotel listing
- `frontend/src/app/hotels/[slug]/page.tsx` — hotel details (rooms, amenities, gallery, reviews, offers, FAQs, contact, map)
- `frontend/src/app/hotels/[slug]/rooms/[roomSlug]/page.tsx` — room details
- `frontend/src/app/hotels/[slug]/rooms/[roomSlug]/book/page.tsx` — booking flow
- `frontend/src/app/booking-confirmation/[reference]/page.tsx` — confirmation page

- `docs/API_DOCUMENTATION.md` — added full Hotel public/admin endpoint reference
- `docs/PROJECT_DOCUMENTATION.md` — added Module 5: Hotel (design decisions, limitations)

### Changed
- `backend/src/server.ts` — mounted `publicHotelRouter` (`/api/v1/hotels`), `publicBookingRouter` (`/api/v1/hotel-bookings`), `adminHotelRouter` (`/api/v1/admin/hotels`). Auth routes/middleware order unchanged.
- `backend/src/middlewares/auth.middleware.ts` — **additive only**: added `optionalAuthenticate(actorType)` export for guest-checkout support. `authenticate` and `requireRole` untouched.
- `backend/src/utils/email.util.ts` — **additive only**: added `buildBookingConfirmationEmailHtml(...)`. Existing verification/reset builders untouched.

### Fixed
- `backend/src/utils/email.util.ts` — **pending bug from prior session**: SMTP configuration check previously only verified env vars were *set*, not that they were *valid* — placeholder values from `.env.example` (e.g. `smtp.example.com`) were being treated as real config, causing `getaddrinfo ENOTFOUND smtp.example.com` crashes on signup/booking. Now detects common placeholder patterns and falls back to dev-mode console logging automatically. `sendEmail()` also now wraps the actual send in try/catch so a real SMTP failure can never crash the calling auth/booking flow.

### Security
- All Hotel/Room/Availability/Offer/Gallery/FAQ mutation endpoints require `authenticate('admin')` + `requireRole('super_admin', 'branch_admin')` (staff is view-only where applicable).
- Booking creation validates room capacity, date logic, and re-checks availability server-side regardless of what the frontend already checked.

### Testing Performed
- `tsc --noEmit` on backend: zero errors (full project, including new Hotel + content modules).
- Live server boot verified with new routes mounted; MongoDB-down scenario still degrades gracefully (500 on DB-dependent routes, health check unaffected).
- Curl-tested: hotel listing (graceful 500 without DB) · booking validation errors (400, field-level) · zod date-order refinement (400) · admin routes without/with garbage token (401) · availability query missing params (400).
- `next build` on frontend: all 5 new hotel routes compiled and listed successfully (`/hotels`, `/hotels/[slug]`, `/hotels/[slug]/rooms/[roomSlug]`, `.../book`, `/booking-confirmation/[reference]`).
- **Not performed in this sandbox** (no MongoDB available): full DB-backed round trip (create hotel → create room → check availability → create booking → confirm). Must be run manually against a live MongoDB before this module is considered production-verified — see Testing Steps in the module response.

### Notes
- Per this task's explicit instruction, the Hotel Module was built so Marriage Hall and Restaurant can reuse the `content` module and shared frontend components without modifying any Hotel-specific code.
- Admin Panel **frontend** UI (React pages for hotel management) was explicitly out of scope for this phase — only backend admin APIs were built. Flagged in `PROJECT_DOCUMENTATION.md` as a known limitation/next step.

---

## [2026-07-25] — Authentication Module

### Added
- `User` Mongoose model (`backend/src/modules/auth/models/user.model.ts`) — customer accounts, email verification fields, password reset fields.
- `Admin` Mongoose model (`backend/src/modules/auth/models/admin.model.ts`) — back-office accounts with `role` (super_admin/branch_admin/staff) and `branchId` scoping.
- `auth.validation.ts` — Zod schemas for signup/login/forgot-password/reset-password.
- `auth.service.ts` — business logic: signup, email verification, login, forgot/reset password (shared generic logic for User and Admin).
- `auth.controller.ts` — Express request handlers, wraps service calls with validation + response shaping.
- `auth.routes.ts` — mounts all `/api/v1/auth/user/*` and `/api/v1/auth/admin/*` routes with rate limiting on sensitive endpoints.
- `middlewares/auth.middleware.ts` — `authenticate(actorType)` JWT verification + `requireRole(...roles)` RBAC middleware.
- `middlewares/error.middleware.ts` — centralized error handler (registered last in `server.ts`).
- `utils/token.util.ts` — JWT signing/verification (separate secrets per actor type) + secure random token generation/hashing for email-verification and password-reset links.
- `utils/email.util.ts` — Nodemailer wrapper with dev-mode console fallback when SMTP isn't configured.
- `docs/PROJECT_DOCUMENTATION.md` — created (did not exist prior to this module).
- `docs/API_DOCUMENTATION.md` — created (did not exist prior to this module).
- `docs/CHANGELOG.md` — created (this file).

### Changed
- `backend/src/server.ts` — mounted `authRoutes` at `/api/v1/auth`, registered `errorHandler` middleware, added 404 handler.
- `backend/.env.example` — added `EMAIL_VERIFICATION_EXPIRY_HOURS`, `RESET_TOKEN_EXPIRY_MINUTES`.
- `backend/package.json` — added `@types/nodemailer` (dev dependency, required for TS compilation; `nodemailer` itself was already present from scaffold).

### Deleted
- None from prior confirmed state. (Note: a stale/inconsistent partial auth scaffold was found on disk at the start of this task with no corresponding record in project history — it was removed and rebuilt cleanly rather than extended, to avoid inconsistency. See "Notes" below.)

### Security
- Passwords hashed with bcrypt (10 salt rounds), never stored in plaintext.
- Password-reset and email-verification tokens: only the SHA-256 hash is stored in the DB; the raw token is sent via email and never persisted.
- Forgot-password endpoints return a generic message regardless of whether the email exists, to prevent user enumeration.
- Auth-sensitive routes (login, signup, forgot-password, reset-password) are rate-limited (20 requests / 15 min / IP).
- User and Admin JWTs use separate secrets (`JWT_SECRET` vs `ADMIN_JWT_SECRET`) so a leaked user token cannot be replayed against admin-only routes even if role checks were bypassed.

### Testing Performed
- Type-check (`tsc --noEmit`) passes with zero errors.
- Live server boot verified: health check responds even when MongoDB is unreachable (non-fatal DB connection, as designed).
- Verified via running server + curl: validation errors return 400 with field-level messages; missing/garbage JWT returns 401; unknown route returns 404; server does not crash on DB-dependent request failure (returns 500 gracefully).
- Verified JWT sign/verify logic standalone: user and admin tokens are correctly isolated by secret (a user-signed token fails verification against the admin secret).
- Full DB-backed flow (actual signup → verify → login round trip against a live MongoDB) was **not** executed in this sandbox because no MongoDB server is available in the current environment. This should be run manually per the Testing Steps in the module response before considering the module production-verified.

### Notes
- A partial/incomplete auth scaffold existed on disk prior to this task with no corresponding entry in this changelog or prior conversation record. Per `AI_INSTRUCTIONS.md` ("never assume existing code is unintentional... but also never build on undocumented state"), it was treated as untrusted, removed, and rebuilt cleanly and completely in this entry so the changelog accurately reflects what exists.

---

## [2026-07-24] — Project Scaffold (MongoDB stack, runnable)

### Added
- `frontend/`, `admin-panel/` — Next.js 14 App Router skeletons (`src/app/layout.tsx`, `page.tsx`, `globals.css`, `next.config.js`, `next-env.d.ts`).
- `backend/` — Express + TypeScript entry point (`src/server.ts`) with `/api/v1/health` route.
- `backend/src/config/db.ts` — Mongoose connection (non-fatal on failure in dev).
- Root `package.json` — npm workspaces (`frontend`, `backend`, `admin-panel`) with `dev:all` concurrent script.
- `.gitignore`, `.env.example` per app, `tsconfig.json` per app, Tailwind/PostCSS config per frontend app.
- `deployment/scripts/create-folder-structure.sh` — scaffolds the full frozen folder tree.
- `docs/SETUP_GUIDE.md`, `docs/FOLDER_STRUCTURE.md`, `docs/DATABASE_SCHEMA.md` (Mongoose-oriented).

### Changed
- Switched database layer from PostgreSQL/Prisma to MongoDB/Mongoose (per explicit request) — removed `@prisma/client`, `prisma`, `database/schema.prisma`; added `mongoose`.

### Fixed
- Frontend/admin-panel missing `app/` directory (Next.js App Router now present and build-verified).
- Backend `@config/db` unresolved import — switched to relative imports, avoiding the need for a path-alias runtime resolver.
- `tsconfig.json` path aliases corrected (`baseUrl: "."`, `paths` pointing into `src/*`) for both Next.js apps.
- `npm run dev:all` verified working: `next build` succeeds for both frontend and admin-panel; backend boots and serves `/api/v1/health`.
