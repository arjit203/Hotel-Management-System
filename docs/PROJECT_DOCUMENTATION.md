# PROJECT_DOCUMENTATION.md — 7 Vachan

**Status:** Living document, updated with every module. This is the bootstrap version — created now alongside the Authentication Module (first module built).

---

## 1. Vision
Unified booking + management platform for Hotel, Marriage Hall, and Restaurant under one domain (7vachan.com), architected multi-branch/multi-tenant from day one, currently operating 1 physical property. See `RULES.md` (frozen) for full authoritative business rules.

## 2. Tech Stack (current)
| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind |
| Admin Panel | Next.js 14 (App Router) + TypeScript + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT (separate secrets for User/Admin), bcrypt password hashing |
| Payments | Razorpay (planned, not yet built) |
| Email | Nodemailer (SMTP; logs to console in dev if SMTP unset) |
| Media Storage | Cloudinary (image upload/transform/delete — added this session) |

## 3. Module Status
| Module | Status |
|---|---|
| Project Scaffold (frontend/backend/admin skeletons) | ✅ Complete |
| Authentication (User + Admin, JWT, RBAC, email verification, forgot password) | ✅ Complete |
| **Hotel (listing, details, rooms, availability, booking, admin management)** | ✅ Complete |
| Shared Content module (Reviews/Gallery/FAQs/Offers — polymorphic, reused by Hotel now, Hall/Restaurant later) | ✅ Complete (backing Hotel; not yet consumed by other verticals) |
| Marriage Hall | ⬜ Not started |
| **Restaurant (backend: menu, dining areas, table availability, instant reservations)** | ✅ Backend complete — frontend not started |
| Booking Engine (shared conflict/locking hardening) | ⬜ Not started — see Known Limitations below |
| Payments | ⬜ Not started |
| Admin Panel UI (frontend for Hotel Management) | ⬜ Not started — backend admin APIs exist; admin-panel frontend pages not yet built |

---

## 4. Module: Authentication

### Purpose
Provides identity, session (JWT), and role-based access control for two distinct actor types: **Users** (customers) and **Admins** (Super Admin / Branch Admin / Staff), matching the separate-collection design in `DATABASE_SCHEMA.md`.

### Design Decisions
- **Two separate Mongoose models** (`User`, `Admin`) rather than one polymorphic model — matches the frozen `DATABASE_SCHEMA.md` structure and keeps customer auth cleanly isolated from back-office auth (different JWT secrets, different token lifetimes, different rate-limit policy possible later).
- **Role-based access** implemented via JWT payload (`role`, `actorType`) checked in `requireRole()` middleware — not hardcoded per-route logic.
- **No public admin signup route.** Per `RULES.md`, admin accounts are provisioned internally (a future Super Admin "manage admins" feature will create Branch Admin/Staff accounts). Only Admin login + password reset are exposed publicly.
- **Email verification** required for User accounts (`isEmailVerified` flag) — enforcement of *what* requires verification is deferred to whichever module needs it (e.g., booking), since no other modules exist yet.
- **Forgot password** uses a time-limited, single-use, hashed token stored directly on the `User`/`Admin` document (not a separate collection) — keeps this module self-contained; can be normalized into its own collection later without breaking the public API contract.
- **Guest checkout is unaffected** — this module only concerns accounts that choose to register/login; no route in this module blocks guest flows.
- **Generic responses on forgot-password** ("If an account with that email exists...") to prevent user enumeration attacks.
- **Dev-mode email fallback**: if SMTP env vars aren't set, `email.util.ts` logs the email content to console instead of failing — keeps local dev/testing possible without real SMTP credentials.

### Dependencies
All already present in `backend/package.json` from initial scaffold — no new packages added except:
- `@types/nodemailer` (new, dev dependency — required for TypeScript compilation)

### Environment Variables Added
- `EMAIL_VERIFICATION_EXPIRY_HOURS` (default 24)
- `RESET_TOKEN_EXPIRY_MINUTES` (default 30)

(All other required vars — `JWT_SECRET`, `ADMIN_JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_JWT_EXPIRES_IN`, `SMTP_*`, `EMAIL_FROM`, `FRONTEND_URL`, `ADMIN_PANEL_URL` — already existed in scaffold's `.env.example`.)

### Folder Location
`backend/src/modules/auth/` — matches the pre-approved `modules/auth/` path in `FOLDER_STRUCTURE.md`.

### Full Endpoint List
See `API_DOCUMENTATION.md`.

### Known Limitations (by design, not gaps)
- No admin account creation endpoint yet (intentional — belongs to a future Admin Management module).
- No refresh-token/logout-blacklist mechanism yet — JWT expiry alone governs session length for this phase (acceptable given no other modules yet depend on long-lived sessions).
- No social login (Google/etc.) — not in current requirements.

---

## 5. Module: Hotel

### Purpose
Complete customer-facing and admin-facing hotel functionality: listing, details, room categories, availability, instant booking (guest or logged-in), reviews, gallery, offers, FAQs — per RULES.md ("Hotel room bookings: instant, real-time availability based").

### Design Decisions
- **Shared `content` module created** (`backend/src/modules/content/`) holding polymorphic `Review`, `GalleryItem`, `Faq`, `Offer` models — matches `DATABASE_SCHEMA.md`'s polymorphic design intent (`reviewable_type`, etc.) and is explicitly built so the upcoming Marriage Hall and Restaurant modules can reuse it without modifying Hotel code, per this task's explicit instruction.
- **`RoomAvailability` stores manual overrides only** (e.g. admin blocks 3 Deluxe rooms for maintenance on a date) rather than one document per room per day forever. Real-time bookable availability = `totalRooms − manuallyBlocked(date) − overlappingConfirmedBookings(date)`, computed on read in `hotel.service.ts`. This keeps the collection small and avoids a background job to pre-generate availability rows.
- **Hotel bookings go straight to `confirmed`** status (no approval step) — this is the key behavioral difference from the planned Marriage Hall module (which will require `pending_admin_approval`), per RULES.md.
- **Guest checkout fully supported** — `POST /hotel-bookings` uses the new `optionalAuthenticate` middleware (see Auth module addendum below) so a booking can be created with or without a logged-in User; if logged in, `userId` is attached automatically.
- **Payment integration deliberately deferred** — bookings currently confirm with `advancePaid: 0` and full `balanceDue`; the booking record structure (`advancePaid`, `balanceDue`) is already payment-ready so the future Payments module only needs to update these fields, not restructure the schema.
- **Booking reference** (`7V-XXXXXXXX`) generated for guest-friendly lookup without requiring login — powers the public confirmation page.
- **Soft deletes** for Hotel/Room (`isActive: false`) rather than hard delete, and both are blocked from deletion if they have dependent active data (rooms/bookings respectively) — preserves booking history integrity per `AI_INSTRUCTIONS.md` backward-compatibility rules.
- **RBAC**: Hotel/Room/Offer/Gallery/FAQ mutation restricted to `super_admin` and `branch_admin`; `staff` can view availability/bookings but not mutate — centralized as `HOTEL_MANAGER_ROLES` constant in `hotel.routes.ts` for easy policy change later.

### Addendum to Auth Module (additive only, not a regeneration)
- `middlewares/auth.middleware.ts` gained one new export, `optionalAuthenticate(actorType)` — behaves like `authenticate()` but never rejects the request; needed for guest-checkout support. Existing `authenticate`/`requireRole` exports are untouched.
- `utils/email.util.ts` gained one new export, `buildBookingConfirmationEmailHtml(...)` — existing verification/reset email builders are untouched. Additionally, the pre-existing SMTP-placeholder-detection bug (`smtp.example.com` from `.env.example` being treated as "configured") was fixed in this session — see `CHANGELOG.md`.
- A new shared `utils/apiError.util.ts` (`ApiError` class) was introduced for the Hotel module and future modules to share; the Auth module's own local `ApiError` (inside `auth.service.ts`) was left untouched to avoid modifying a completed module — unifying these is flagged as minor tech debt for a future cleanup pass.

### Dependencies
No new npm packages required at initial build — Hotel module used only what Auth/scaffold already installed (`mongoose`, `zod`, `express`, `nodemailer`).
- **`framer-motion`** (`^12.43.0`, frontend only, added [2026-08-02]) — the motion layer for the public site (scroll reveals, headline masks, parallax, route transitions, animated accordions/lightboxes). Justification per `AI_INSTRUCTIONS.md` §19: the brief explicitly specified Framer Motion, and the required behaviours (`whileInView` orchestration, `AnimatePresence` exit transitions, spring-smoothed scroll values, staggered variants) are not reasonably reproducible with CSS transitions alone. Cost is ~40–50KB gzip on nearly every route; see the CHANGELOG note on the pending `LazyMotion` reduction. No backend or admin-panel dependency was added.
- **`cloudinary`** (`^2.5.1`, added [2026-07-30] session) — image upload/transform/delete for Hotel/Room/Gallery/Offer images. `multer` (already in scaffold's `package.json` since initial setup but previously unused) now used for in-memory file handling ahead of the Cloudinary upload. No `@types/cloudinary` needed — the SDK ships its own types.

### Environment Variables Added
- [2026-07-30] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — required for `POST/DELETE /api/v1/admin/hotels/upload-image` to function; get these from the Cloudinary dashboard (Settings → API Keys). Without them, upload routes respond `500` with a clear "not configured" message rather than crashing the server (see `config/cloudinary.ts`).
- [2026-07-30] `MAX_IMAGE_UPLOAD_MB` (optional, default `5`) — max accepted upload size per image.
- (Previously: none beyond reusing existing `FRONTEND_URL`/`EMAIL_FROM`/SMTP vars from the Auth module's `.env`.)

### Folder Locations
- `backend/src/modules/hotel/` — models, service, controller, routes, validation (matches pre-approved path)
- `backend/src/modules/content/` — new shared module (models + service) for Review/Gallery/Faq/Offer, per `FOLDER_STRUCTURE.md`'s `content/` slot
- `backend/src/config/cloudinary.ts` — [2026-07-30] Cloudinary SDK config (shared, not hotel-specific — reuse for Hall/Restaurant later)
- `backend/src/utils/cloudinary.util.ts` — [2026-07-30] shared upload/delete helper functions (shared, not hotel-specific)
- `backend/src/middlewares/upload.middleware.ts` — [2026-07-30] multer memory-storage middleware (shared, not hotel-specific)
- `frontend/src/modules/hotel/components/` — `HotelCard`, `RoomCard`, `BookingForm`
- `frontend/src/components/` — new shared, vertical-agnostic components: `StarRating`, `FaqAccordion`, `GalleryGrid`, `MapPlaceholder`
- `frontend/src/app/hotel/` — Next.js App Router pages: `/hotel`, `/hotel/about`, `/hotel/rooms`, `/hotel/rooms/[roomSlug]`, `/hotel/gallery`, `/hotel/offers`, `/hotel/amenities`, `/hotel/reviews`, `/hotel/faqs`, `/hotel/contact`, `/hotel/booking`, `/hotel/booking/confirmation/[reference]` — **[Phase 3.7, 2026-08-01]** split out from a single `/hotel` page into a full multi-page premium website; see CHANGELOG.md for the complete list of new pages/components. No backend/database changes were made for this phase.
- `frontend/src/components/motion/` — **[Phase 3.8, 2026-08-02]** shared, vertical-agnostic motion primitives (`Reveal`, `Stagger`, `TextReveal`, `Parallax`, `LuxeImage`, `PageTransition`, `ScrollProgress`, `AnimatedNumber`, `variants.ts`). Built to be reused by Hall/Restaurant — do not duplicate per vertical. All honour `prefers-reduced-motion` and animate only `opacity`/`transform`.
- `frontend/src/components/auth/` — **[Phase 3.8]** customer auth presentation (`AuthShell`, `FloatingField`, `SocialPlaceholders`, `LoginForm`, `SignupForm`). Presentation only; all calls go to the existing `/auth/user/*` endpoints.
- `frontend/src/components/{PageHeader,Skeleton}.tsx` — **[Phase 3.8]** the single page-header treatment (also emits breadcrumb JSON-LD) and shared loading placeholders.
- `frontend/src/components/ui/` — **[Phase 3.9, 2026-08-02]** shared, vertical-agnostic UI primitives extracted from proven duplication: `Lightbox` (was 3 copies), `Alert` (5), `EmptyState` (5), `Pagination` (2), `StatusBadge` (2), `Monogram` (2). Reuse these in Hall/Restaurant; do not re-implement.
- `frontend/src/lib/theme.ts` — **[Phase 3.9]** design tokens for TypeScript consumers (colours, fonts, easing, durations, intervals, breakpoints, layout, radii, shadows). Mirrors `tailwind.config.js`, which remains the source for CSS utilities — **edit both together.**
- `frontend/src/lib/format.ts` — **[Phase 3.9]** shared formatters (`money`, `formatDate*`, `nightsBetween`, `todayISO`, `initial`). `nightsBetween` mirrors the backend's `calculateNights` so displayed and charged night counts cannot diverge.

### Design System (frontend, Phase 3.8)
**→ Full reference: `docs/DESIGN_SYSTEM.md`. Read it before building the Marriage Hall or Restaurant front-end** — those verticals must reuse this system (tokens, `.btn-*`/`.card-luxe` classes, and `components/motion/*`) rather than fork it, per `AI_INSTRUCTIONS.md` §6/§15. That document ends with a per-vertical checklist.

The public site's visual language is defined in exactly two places and must not be re-invented per page:
- `frontend/tailwind.config.js` — colour tokens (`ink`/`gold`/`cream`/`warm`), the fluid `display-*` type scale, `ease-luxe`, shadows, radii, keyframes.
- `frontend/src/app/globals.css` — `.container-luxe`/`.section` rhythm, `.section-eyebrow`/`.section-title`/`.page-title`/`.card-title`/`.lead`/`.body-muted`/`.meta` typography, the `.btn-*` family, `.card-luxe`/`.glass`/`.media`/`.skeleton`/`.field` surfaces, the print stylesheet, and the reduced-motion block.

Contrast rule: `warm-400` is the lightest colour permitted for body text (5.3:1 on cream). Anything lighter fails WCAG AA and must not be introduced.

### Full Endpoint List
See `API_DOCUMENTATION.md`.

### Known Limitations (by design, not gaps)
- **Booking race condition**: availability is checked immediately before booking creation but without a DB transaction/distributed lock. Under concurrent requests for the last available room, a double-booking is theoretically possible. Flagged explicitly as a hardening item for the future **Booking Engine** module (per `RULES.md`, that module is shared across Hotel/Hall/Restaurant) rather than solved ad hoc inside the Hotel module alone.
- **Admin Panel frontend UI not built** — this task built the backend admin APIs (Hotel/Room/Availability/Offers/Gallery/FAQ/Booking management, all RBAC-protected) but not the corresponding `admin-panel` React pages/forms. The admin can currently only be exercised via API calls (e.g. Thunder Client/Postman) until the Admin Panel UI module is scoped and built.
- **Real Google Maps embed not implemented** — `MapPlaceholder` component shows a link-out to Google Maps search rather than an embedded interactive map, pending `GOOGLE_MAPS_API_KEY` billing setup (env var already reserved).
- **Restaurant online-ordering-style deferred features don't apply here** — Hotel has no Phase-2-deferred features; all 14 requested Hotel Module requirements are fully implemented now.

---

## 6. Module: Restaurant

### Purpose
Public restaurant presence and **instant table reservation**: menu browsing with
search and filters, Chef Specials, Today's Special, dining areas (including
Private and Family dining), table availability, timings, reviews, gallery, FAQs
and offers.

### Scope boundary (from RULES.md §2)
- **Table reservation is INSTANT** — created directly as `confirmed`, no admin
  approval. Approval-based booking belongs to Marriage Hall, not here.
- **No payment.** Holding a table is free; `TableReservation` deliberately carries
  no amount, advance, Razorpay or invoice fields.
- **Online food ordering is Phase 2.** No cart, checkout, delivery tracking or
  food payment exists anywhere in this module — only menu browsing and an
  "Order Online" entry point on the frontend.

### Design Decisions
- **Mirrors the Hotel module's architecture exactly** — validation → service →
  controller → routes, the same `{ success, data }` envelope, the same
  `authenticate`/`optionalAuthenticate`/`requireRole` middleware, the same
  `ApiError` class, the same soft-delete-with-dependency-guard policy. Nothing was
  re-invented.
- **The shared `content/` module is reused wholesale** for reviews, gallery, FAQs
  and offers. Its models already accepted `"restaurant"` in their polymorphic
  enums, so **zero model changes were needed** — only routes to expose them. No
  restaurant-specific copies of those four features exist.
- **`DiningArea` is the availability unit, not individual tables.** Reservations
  count against an area's `totalTables`; the host assigns specific tables on the
  floor. Modelling individual tables would encode a precision the business does
  not operate at.
- **`TableAvailability` stores manual overrides only** — the same decision as
  `RoomAvailability`. Bookable tables are computed on read as
  `totalTables − blocked − activeReservations`, so no background job
  pre-generates rows. A day-wide override (no `timeSlot`) and a slot override sum
  together.
- **`reservationSlots` and `serviceHours` are admin-configured data**, not derived
  from a hardcoded interval, per `AI_INSTRUCTIONS.md` §15 (configuration must be
  data-driven). This also lets the service reject a slot the restaurant does not
  actually offer.
- **Party-to-table maths is explicit**: `ceil(partySize / area.maxPartySize)`, so a
  party of 10 in a 4-seat area consumes 3 tables.
- **Reference prefix `7VR-`** distinguishes a restaurant reservation from a hotel
  booking's `7V-` at a glance, for guests and reception alike.
- **Menu search uses an escaped regex**, not the model's `$text` index, because
  MongoDB cannot combine `$text` with a sort on another field efficiently, and
  guests expect partial-word matching ("pane" → "Paneer"). The text index remains
  on the model for future use.
- **Guest checkout supported** — `optionalAuthenticate` on reservation and review
  routes, exactly as in Hotel.

### Dependencies
**No new npm packages.** The module uses only what Auth/Hotel already installed
(`mongoose`, `zod`, `express`, `nodemailer`, `multer`, `cloudinary`).

### Environment Variables Added
**None.** Reuses `MONGODB_URI`, `JWT_SECRET`/`ADMIN_JWT_SECRET`, `SMTP_*`,
`EMAIL_FROM`, `CLOUDINARY_*` and `ADMIN_NOTIFICATION_EMAIL`.

### Folder Locations
- `backend/src/modules/restaurant/` — validation, services, controller, routes
- `backend/src/modules/restaurant/models/` — `restaurant`, `menuCategory`,
  `menuItem`, `diningArea`, `tableAvailability`, `tableReservation`
- `backend/src/utils/email.util.ts` — gained two **additive** exports
  (`buildReservationConfirmationEmailHtml`, `buildReservationCancellationEmailHtml`);
  every existing builder is untouched
- `backend/src/server.ts` — three additive `app.use` mounts

### Full Endpoint List
See `API_DOCUMENTATION.md`.

### Known Limitations (by design, not gaps)
- **Reservation race condition** — the availability check and the insert are not
  one transaction, so two simultaneous requests for the last table could both
  succeed. Identical to the Hotel module's booking race, and deliberately deferred
  to the same shared **Booking Engine** hardening item so both verticals get one
  fix rather than two divergent ones.
- **Integration-tested end-to-end** against the live database: create restaurant →
  category → menu items → dining areas → availability grid → reserve → overbook
  rejection → cancel → tables released → admin override → delete guards, followed
  by full cleanup. See CHANGELOG for the result table.
- **No Restaurant admin-panel UI** — the admin APIs exist; the `admin-panel` pages
  do not. Same position the Hotel module was in after its backend phase.
- **Restaurant frontend not started.**

---
