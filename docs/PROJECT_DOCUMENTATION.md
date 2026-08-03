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
| Shared Content module (Reviews/Gallery/FAQs/Offers — polymorphic) | ✅ Complete — now consumed by all three verticals with no model changes |
| **Marriage Hall (venue, packages, showcases, availability calendar, approval-first enquiries)** | ✅ Complete — see §8. Seed not yet run in this environment |
| **Restaurant (backend: menu, dining areas, table availability, instant reservations)** | ✅ Backend complete — public frontend complete |
| Booking Engine (shared conflict/locking hardening) | ⬜ Not started — see Known Limitations below |
| Payments | ⬜ Not started |
| **Admin Console UI (Hotel + Restaurant + Marriage Hall, shared Admin Design System)** | ✅ Built — see §7. Awaiting a manual click-through of the write paths |

---

## 4. Module: Authentication

### Purpose
Provides identity, session (JWT), and role-based access control for two distinct actor types: **Users** (customers) and **Admins** (Super Admin plus one manager per vertical), each in its own collection with its own JWT secret.

### Design Decisions
- **Two separate Mongoose models** (`User`, `Admin`) rather than one polymorphic model — matches the frozen `DATABASE_SCHEMA.md` structure and keeps customer auth cleanly isolated from back-office auth (different JWT secrets, different token lifetimes, different rate-limit policy possible later).
- **Role-based access** implemented via `requireRole()` middleware after `authenticate()` — not hardcoded per-route logic. For admins the role is read **live from the database** on every request rather than trusted from the JWT payload, so a demotion or deactivation takes effect on the target's very next call instead of when their token expires. User tokens are deliberately not re-read: that path is public-facing, far higher volume, and carries no privileged role to revoke.

#### Admin roles — four, one owner per vertical (revised 2026-08-03)
`super_admin`, `hotel_manager`, `restaurant_manager`, `hall_manager`.

`branch_admin` and `staff` were **removed** at the owner's decision. 7 Vachan will
run a single branch, which made a branch-scoped admin a second Super Admin under a
different name, and the read-only `staff` tier had nobody to fill it — a manager
already reads everything inside their own vertical. Seventeen
`requireRole(...X, "staff")` read-guards collapsed to `requireRole(...X)`.

This removed the **roles**, not the multi-tenant **data model**. `branchId` stays
on every property and on every non-Super-Admin account because `RULES.md` §26
freezes that requirement; adding a second branch later means reintroducing a role,
not migrating data. The admin panel prefills the single branch so nobody has to
copy an ObjectId out of the database.

Scope is now **derived from the role** — `businessScope` is stored only so the
admin list shows one consistent column, and is ignored if a client sends it. That
was verified by creating a `hotel_manager` with `businessScope: ["hotel","restaurant","hall"]`
in the body; the stored scope came back as `["hotel"]`.

**Known limitation — legacy role rows.** An account created before this change
keeps its old role string in the database. `ROLE_IMPLIED_SCOPE[role]` is
`undefined` for those, and reading `.length` off it took the entire
`GET /admin/users` endpoint down with a 500 — meaning one stale document cost you
the very screen you would use to fix it. `effectiveScope()` and `resolveScope()`
now guard for it, the API returns `isLegacyRole: true` on such rows, and the admin
panel shows a red "retired" badge plus a banner telling you to reassign or delete
them. A legacy account resolves to an empty scope and is refused by every module,
so it is inert rather than dangerous.
- **No public admin signup route.** Per `RULES.md`, admin accounts are provisioned internally — the first Super Admin is seeded, and every account after that is created by a Super Admin through `/api/v1/admin/users`. Only Admin login + password reset are exposed publicly.
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
- **RBAC**: every Hotel admin route requires `HOTEL_MANAGER_ROLES = ["super_admin", "hotel_manager"]`, centralized as a constant in `hotel.routes.ts` so policy changes in one place. There is no read-only tier — the `staff` role was removed, and a hotel manager reads and writes everything in Hotel and nothing outside it.

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
- ~~**No Restaurant admin-panel UI**~~ — resolved 2026-08-03; see §7.

---

## 7. Module: Admin Console (`admin-panel/`)

### Purpose
The back-office UI for the owner and the three vertical managers. It is a **productivity tool**, not a brand surface:
speed, density and readability come before decoration. It never touches MongoDB
— every screen calls `/api/v1` like any other client.

### Design system — separate from the public site, on purpose
`docs/DESIGN_SYSTEM.md` (ink / gold / cream, display serif, luxury hospitality)
governs `frontend/` **only**. The console uses its own neutral SaaS token set in
`admin-panel/tailwind.config.js` — white cards on light grey, one indigo accent,
semantic status colours, system font stack, 12px type floor.

**Do not cross-import between the two.** Both config files carry a header
comment saying so. The reason the rule needs stating: the panel previously
contained copies of the public site's `Toast` and `ConfirmDialog` that referenced
`charcoal` / `gold` / `beige` / `font-body` — classes the admin Tailwind config
never defined, so they would have rendered unstyled. Those components have been
rewritten against the admin tokens.

Shared component classes live in `admin-panel/src/app/globals.css`
(`.btn-*`, `.card*`, `.input`, `.dt`, `.badge-*`, `.nav-item*`, `.tab*`,
`.skeleton`, `.page-shell`). Compose from these; don't re-declare padding,
border and colour per page.

### Design Decisions
- **`RequireAdmin` is the gate *and* the shell.** Its import contract is
  unchanged — every page still wraps itself in it — so no page had to be
  restructured. What changed is what it renders.
- **Providers live in the root layout, not in `RequireAdmin`.** Each page mounts
  its own `RequireAdmin`, so providers placed there would remount and refetch on
  every navigation. `AdminSessionProvider` gates the data providers so `/login`
  issues no authenticated requests.
- **`SummaryProvider` is the session-level operational cache.** Bookings,
  reservations, reviews and content totals load once and back the Dashboard,
  notification tray, Bookings, Reservations, Customers, Reviews and Analytics.
  Every figure in the console is computed from these lists — **there is no
  analytics, stats or notifications endpoint in this backend and none was
  added.**
- **`DataTable` searches, sorts and pages client-side.** Every admin list route
  returns a complete array; there is no `?page=` to hook into. If one ever gains
  server pagination, replace the `pageRows` memo with props.
- **Content managers are written once for both verticals.** `GalleryManager`,
  `OffersManager`, `FaqManager` and `ReviewsManager` take `/admin/hotels` or
  `/admin/restaurants` as a base path, mirroring the polymorphic content module
  server-side. `ReviewsManager` hides per-image removal for Restaurant because
  only Hotel exposes `DELETE /reviews/:id/images`.
- **The business selector is two-level** (vertical, then property) even though
  each vertical has one property today — matching the multi-tenant mandate.
  Marriage Hall is rendered but locked; there is no `/api/v1/admin/halls`.
- **The console is `noindex`.** Opposite of the public site's SEO requirement,
  and deliberate: these pages sit behind auth.
- **Authorization is never re-implemented client-side.** `RequireAdmin` and any
  hidden control are UX only; the API re-checks `authenticate("admin")` +
  `requireRole(...)` on every request.

### Dependencies
No new npm packages. Uses what `admin-panel/package.json` already had:
`next`, `react`, `lucide-react`, `recharts`. `axios`, `react-hook-form`, `zod`,
`@hookform/resolvers` and `react-table` remain declared but unused by these
pages (forms are controlled React; the table is the in-house `DataTable`).

### Environment Variables Added
| Var | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_FRONTEND_URL` | Public site origin, used only for "View public page" links. Optional. | `http://localhost:3000` |

Existing: `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:5000/api/v1`).

### Folder Locations
- `admin-panel/src/app/` — routes (20). Hotel: `/hotels`, `/hotels/[hotelId]`,
  `/hotels/[hotelId]/rooms/[roomId]`, `/bookings`. Restaurant: `/restaurants`,
  `/restaurants/[restaurantId]`,
  `/restaurants/[restaurantId]/dining-areas/[areaId]`, `/reservations`.
  Cross-vertical: `/`, `/customers`, `/gallery`, `/reviews`, `/offers`, `/faqs`,
  `/analytics`, `/users`, `/settings`, `/halls`, `/login`.
- `admin-panel/src/components/ui/` — design-system primitives
- `admin-panel/src/components/layout/` — sidebar, topbar, business selector,
  command palette, navigation definition
- `admin-panel/src/components/content/` — the four shared content managers
- `admin-panel/src/components/restaurant/` — menu categories, dishes, dining areas
- `admin-panel/src/lib/` — `api`, `adminSession`, `businessContext`, `summary`,
  `shellUi`, `useActiveContent`, `format`, `cn`

### Full Endpoint List
None. The console adds no endpoints — see `API_DOCUMENTATION.md` for the routes
it consumes.

### Known Limitations (by design, not gaps)
- **SEO meta fields cannot be pre-filled when editing** a hotel or restaurant.
  The public aggregates don't return `metaTitle` / `metaDescription`, so both
  forms start blank and only send those fields when filled. Unchanged from the
  previous panel; fixing it needs an admin read route.
- **Offers list shows currently-valid offers only** — `getActiveOffers` filters
  by date server-side, so expired offers exist but cannot be listed or edited.
- **FAQs cannot be edited**, only created and deleted — there is no FAQ update
  route.
- **Bulk actions loop client-side**, one request per record; no batch endpoint
  exists. Partial failures are counted and reported.
- **`/customers` is derived from bookings and reservations**, not from user
  records. No admin route lists users, and guest checkout means most customers
  never register.
- **`/users` cannot create or edit admins.** No signup route, no admin-list
  route — accounts are provisioned by the seeder.
- **Write paths are not yet verified by execution.** Build, types and live
  payload shapes were checked; a manual click-through of create / edit / delete /
  upload / status-change is still outstanding.

---

## 8. Module: Marriage Hall

### Purpose
The third vertical: a banquet venue whose website exists to make a family
*picture their wedding in the room* and then ask to visit. Built frontend-first
per the Phase 4 brief (80% experience / 20% backend), and visually richer than
the Hotel module by design.

### Scope boundary (from RULES.md §14)
**Hall bookings are never instant or self-serve.** A family submits an
*enquiry*; nothing is reserved and nothing is charged. An admin reviews it,
speaks to them offline, and only then confirms — which is the moment the date is
held. Payment, when the Payments module exists, is triggered *after* approval.

Consequently there is **no amount, advance, paymentStatus, Razorpay order or
invoice field anywhere in this module**, and there must not be one without a
rules change. Copying Hotel's instant-booking flow here would be a business
error, not just a technical one.

### Design Decisions
- **One `HallShowcase` collection serves four sections** — decoration themes,
  catering, dining arrangements and floral styling. They are the same shape (a
  titled, illustrated, ordered card with a description, a category and bullet
  highlights), so four near-identical models, services, route groups and admin
  panels were not written. `showcaseType` selects the section, `category`
  sub-groups within it. Type-specific fields (`colorPalette` and
  `beforeImageUrl` for decoration, `sampleItems` for catering) are optional
  columns, not a loose `Mixed` bag, so they stay validated and queryable.
  Adding a fifth section later is one enum value and one config entry.
- **`priceLabel` is a free-text string, never a number.** The owner has not set
  pricing, and the eventual model may be per-plate rather than per-event. A
  numeric field would push a placeholder onto the public site and force a schema
  change the day that is decided. Default: `"On request"`. Catering carries no
  price at all — it is showcase content, with no cart, order or quote endpoint.
- **`HallAvailability` stores manual overrides only** — the same decision as
  `RoomAvailability` and `TableAvailability`. A day's status is computed on read:
  an admin override always wins, otherwise a `confirmed` enquiry reads as
  `booked` and a `pending`/`reviewing` one as `tentative`. Setting a date back to
  `available` **deletes** the row, so an empty collection genuinely means
  "nothing is held". No pre-generation job.
- **`approved` deliberately does not hold the date.** It means the venue is
  willing and the conversation has started; only `confirmed` writes a calendar
  block. Several families can be discussing the same auspicious date, and
  showing it as gone would lose the others. Releasing a date only removes the
  override *this enquiry* created, so a hand-placed manager block on the same day
  survives.
- **The enquiry snapshots the chosen package and theme names** at submit time,
  so renaming a package in the admin panel later does not rewrite what the
  family actually asked for.
- **`hall_manager` is a new admin role, added additively.** Hotel and Restaurant
  name their own managers explicitly, so a
  `hall_manager` token is refused there by the same `requireRole` check every
  other route already uses — the isolation the brief asked for falls out of the
  existing pattern rather than needing new middleware. No existing role's
  permissions changed.
- **Reference prefix `7VH-`** sits alongside the hotel booking's `7V-` and the
  restaurant reservation's `7VR-`, so anyone can tell the three apart at a glance.
- **The public calendar is `no-store`, everything else is cached 120s.** A
  date's status is the one thing that changes as enquiries arrive, and a cached
  "available" on a date that has just been taken is the most damaging error this
  site could make. The editorial content has no such risk — and unlike Hotel,
  no stale rate can cause a wrong charge, because there are no rates.

### Reused, not rebuilt
- **`content.service.ts` wholesale** for reviews, gallery, FAQs and offers. The
  polymorphic enums already accepted `"hall"`, so **zero content-model changes
  were required** — only routes.
- **The public design system in full.** `Hero`, `Reveal`, `Parallax`,
  `TextReveal`, `Stagger`, `LuxeImage`, `Lightbox`, `PageHeader`,
  `Breadcrumbs`, `FaqAccordion`, `ReviewsList`, `ReviewForm`, `ContactForm`,
  `MapPlaceholder`, `AnimatedNumber`, `EmptyState` and the whole `ink`/`gold`/
  `cream` token set are used as-is. Exactly one new file landed in
  `frontend/src/components/`: `HallSchema.tsx`.
- **The admin content managers.** `GalleryManager`, `OffersManager`,
  `FaqManager` and `ReviewsManager` serve a third vertical with no change beyond
  a base-path prop.
- `auth.middleware`, `apiError.util`, `cloudinary.util`, `upload.middleware`,
  `email.util`, `db` config — all imported, none duplicated.
- **No new npm package. No new environment variable.**

### Dependencies
Nothing added. Backend uses what the Hotel and Restaurant modules already pull
in; the frontend uses `framer-motion` and `lucide-react`, both already present.

### Environment Variables Added
None.

### Folder Locations
- `backend/src/modules/hall/` — validation, services, controller, routes
- `backend/src/modules/hall/models/` — `hall`, `hallPackage`, `hallShowcase`,
  `hallAvailability`, `hallEnquiry`
- `backend/src/utils/email.util.ts` — gained two **additive** exports
- `backend/src/server.ts` — three additive mounts
- `backend/src/modules/auth/models/admin.model.ts` — `hall_manager` added to the
  role union and enum (additive)
- `frontend/src/app/marriage-hall/` — eight public routes
- `frontend/src/modules/hall/components/` — `MasonryGallery`,
  `AvailabilityCalendar`, `EnquiryForm`, `DecorationThemes`, `BeforeAfter`,
  `ShowcaseSection`, `PackageCards`, `FloatingEnquiry`, `HallEmpty`
- `frontend/src/lib/hall.ts`, `frontend/src/components/HallSchema.tsx`
- `admin-panel/src/app/halls/`, `admin-panel/src/app/enquiries/`
- `admin-panel/src/components/hall/` — `PackagesPanel`, `ShowcasePanel`,
  `CalendarPanel`
- `database/seeders/seed-demo-content.ts` (all three verticals)

### Public routes
`/marriage-hall` · `/gallery` · `/packages` · `/decorations` · `/catering` ·
`/availability` · `/reviews` · `/contact`

Floral styling lives on `/decorations` and dining on `/catering`, because the
brief's eight routes don't include `/floral` or `/dining` and splitting a
family's styling or catering decision across two URLs would make them navigate
to compare.

### Full Endpoint List
See `API_DOCUMENTATION.md`.

### Seeding
See §9 — the Marriage Hall is seeded by the shared `seed-demo-content.ts`
alongside the other two verticals.

### Known Limitations (by design, not gaps)
- **No payment.** Deliberate — see the scope boundary above. The enquiry model
  is payment-*ready* in the sense that adding fields later needs no
  restructuring, but nothing should be added before the Payments module and a
  `RULES.md` decision.
- **No numeric pricing anywhere**, for the reason given above.
- **Enquiry race condition** — the date-availability check and the enquiry
  insert are not one transaction, so two simultaneous enquiries for the last
  open date could both be accepted. Materially less harmful here than in Hotel
  (nothing is reserved, and an admin reads every enquiry before confirming), and
  deferred to the same shared **Booking Engine** hardening item.
- **`spaces[]` is API-editable only** — the admin venue form covers everything
  else, but per-space capacity rows have no UI yet.
- **FAQs cannot be edited**, only created and deleted — a shared content-module
  limitation, not hall-specific.
- **The seed has not been run in the development environment used to build this**
  (`querySrv ECONNREFUSED` resolving the Atlas SRV record from that shell). Until
  it runs, `GET /halls` returns `[]` and every public hall page renders its empty
  state rather than the designed experience.
- **No browser verification.** Build, types, route wiring and endpoint shapes are
  verified; visual rendering and admin CRUD execution are not.

---

## 9. Demo content seeding

### Purpose
`database/seeders/seed-demo-content.ts` fills all three verticals with
presentable photography and showcase copy, so the site can be reviewed and
demonstrated before the owner's own photographs exist.

```bash
cd backend && npx ts-node ../database/seeders/seed-demo-content.ts \
  --email you@example.com --password yourpassword
```

**The backend must be running**, and the credentials are the same ones you use
for the admin panel. `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables work
instead of the flags. Sign in as a Super Admin to seed all three verticals in
one run — a vertical manager can only write their own, and the seeder says so
before the other two start returning 403.

Idempotent — safe to run repeatedly. It replaced the earlier
`seed-marriage-hall.ts`, which covered one vertical and used a different image
source; keeping both would have let their imagery drift apart.

### Why it writes through the API instead of Mongoose
The obvious design — connect with Mongoose, insert documents — was written first
and could not run. A `mongodb+srv://` URI needs a DNS SRV lookup, and on this
network every new process gets `querySrv ECONNREFUSED`, even though the
already-running backend (which connected earlier) keeps working fine.

Going through `/api/v1/admin/*` reuses the backend process's live connection, so
there is no DNS lookup and no connection string in the script at all. Two
further benefits fell out of it: every write passes the real Zod validation and
RBAC, so the seed cannot create a document the application itself would reject;
and the run doubles as a live smoke test of the admin API.

### Two traps worth knowing before writing another seeder
- **ts-node executes a `.ts` file only when it contains at least one `import` or
  `export`.** With none, it treats the file as a plain script and runs nothing —
  exit 0, no output, no error, and a database that stays empty for no visible
  reason. `seed-demo-content.ts` keeps a `path`/`dotenv` import partly for this,
  with a comment saying not to remove it.
- Seeders under `database/` sit outside `backend/tsconfig.json`'s rootDir, so
  they load as ES modules where **`__dirname` does not exist**. Resolve paths
  from `process.cwd()` and run from `backend/`.

### What it writes, and what it will not touch
**Replaces (media only, because these held placeholder URLs):** gallery items ·
`Room.images` · `MenuItem.imageUrl` · `DiningArea.images`.

**Adds only what is missing, so your own entries always survive:** hall packages
(matched on slug) · hall showcases (matched on `showcaseType` + title) · FAQs and
offers (added only when that owner has none at all) · blank hall fields
(`heroImages`, `eventTypes`, `features`, `spaces`).

**Never touches, under any circumstance:** `HotelBooking`, `TableReservation`,
`HallEnquiry`, `User`, `Admin`, room pricing or capacity, menu prices, package
`priceLabel`, or any property's name, slug, description or contact details. Live
operational data is out of scope for a content seeder, and losing a real booking
to a demo script would be unrecoverable.

**It enriches whichever Hotel / Restaurant / Hall already exists — it never
creates a second one alongside yours.** An earlier version upserted the hall on
slug `7-vachan-banquets`, which would have produced a duplicate next to a hall
created in the admin panel; and because `getTheHall()` takes the first row of a
newest-first list, the seeded one would then have hidden the real one on the
public site.

### Images
Pexels, free for commercial use with no attribution required
(https://www.pexels.com/license/). Served straight from `images.pexels.com`
with a width transform — nothing is uploaded to Cloudinary, so replacing them
later is just uploading real photographs through the admin panel, which
overwrites these URLs. Every one of the 124 photo IDs was verified to return
HTTP 200 before being written into the file.

Non-Cloudinary URLs pass through `cldImage()` untouched and `LuxeImage` renders
a plain `<img>`, so no `next.config.js` remote-host whitelisting is involved.

### Implementation notes
- Declares its own loose Mongoose schemas rather than importing the real models
  — that import fails under ts-node from `backend/` (`ERR_MODULE_NOT_FOUND`),
  which is why `seed-super-admin.ts` does the same. Models are typed
  `Model<any>`, because a `strict: false` schema has no document interface to
  infer from and the `models.X || model(...)` union otherwise produces
  incompatible overloads.
- Resolves `.env` from `process.cwd()` rather than `__dirname`, because the file
  sits outside `backend/tsconfig.json`'s rootDir and therefore loads as an ES
  module where `__dirname` does not exist. Run it from `backend/`.
- Menu-item and dining-area photographs are matched by a keyword regex against
  the record's existing name, so re-running after adding dishes picks the new
  ones up without any edit here.
- On a `querySrv` DNS failure it prints the actual cause (SRV lookups blocked by
  the network/VPN) and the fix, rather than a bare stack trace.

### Known limitation
Photographs are matched to subjects by search term, not by inspection — a dish
whose name matches no rule falls back to a generic plate. Re-check the pairings
once, and either rename the dish or upload the real photograph.

---

---

## 10. Module: Platform Settings & Admin Console (`backend/src/modules/settings`, `backend/src/modules/audit`, `backend/src/modules/console`)

### Purpose
Turns the admin panel into a CMS and gives it the cross-cutting tooling a
back-office needs: site-wide configuration, an audit trail, an activity
timeline, a notification centre, exports and global search.

All six are **additive**. No booking, reservation or enquiry flow changed, and
no existing endpoint changed shape. Two of the six were built specifically so
that would be true — see the audit middleware and the derived activity feed
below.

### Design decisions

**Settings: one document per category, not one row per key.** A key/value
collection means a query per field and a migration every time the CMS grows a
text box. A category document is read once and handed to the page whole. The
cost is that `values` is schemaless, so validation lives in
`settings.validation.ts` — which is where every other module validates anyway.
Reads merge the stored document over `SETTING_DEFAULTS`, so a field added to the
defaults file appears immediately on installs whose document predates it, and
"reset to defaults" is a delete rather than a data-entry job.

**Every default is a transcription of what the page rendered before.** An
install that never opens Settings must look identical. A default is not a place
to improve the copy; getting this wrong makes the CMS a silent redesign.

**Secrets are write-only and live outside `values`.** `values` is returned
verbatim to the admin panel and its public subset to anyone. A secret stored in
`values` would leak the first time someone added a category to the public list.
Ciphertext in its own field makes that mistake impossible: the read path merges
`secretHints`, never `secrets`. Blank means keep, `__clear__` means delete —
which is what makes "change the SMTP port without retyping the password" work.

**Public exposure is decided per category, not per key.** One reviewable
decision governs a whole group (`PUBLIC_SETTING_CATEGORIES`), and because
secrets are stripped before that code runs, a mistake there leaks copy rather
than credentials.

**Integrations reach their consumers through `process.env`.** `razorpay.util.ts`,
`config/cloudinary.ts` and `email.util.ts` already read env vars lazily at call
time (each documents why — `dotenv.config()` runs after imports resolve). That
existing decision is what lets `applyIntegrationEnv()` deliver saved credentials
without a line changing in any of them. Blank values and decryption failures are
skipped, leaving `.env` as the fallback, so a half-filled Settings page cannot
take payments offline. The single edit required was `resetEmailTransport()`,
because nodemailer caches its transporter.

**Audit rows are written by a middleware, not by thirty controllers.**
Sprinkling `audit.record()` through the codebase would touch every module, be
forgotten on the thirty-first route, and put logging inside functions whose job
is something else. `auditLogger()` mounts once per admin router, hooks
`res.on("finish")` so it runs after the response is sent, and therefore covers
routes that do not exist yet. Login and failed login are recorded explicitly in
the auth controller, because login is not on an admin router and a failed
attempt is worth recording precisely because nothing changed.

**The activity feed is derived, not stored.** An `Activity` collection written to
on every event would mean edits inside `createHotelBooking`, `verifyPayment`,
`createReservation`, `createEnquiry` and the review path — five changes to
money-handling code for a dashboard widget, and a booking that could fail
because a feed insert did. Deriving costs five indexed, capped, projected
queries; it cannot drift from the records, cannot double-count a retry, and
needed no backfill for data that predated the module.

**Notifications store only the read half.** There is no notification row to flip
a flag on, and per-admin read state is genuinely new information rather than a
copy of something else. "Mark all read" writes one watermark document instead of
hundreds of rows.

**`/admin/console/*` has no `requireRole`.** These features are scoped, not
restricted — every role needs a dashboard, a bell and a search box, just
containing different data. Scoping happens per request via `scopeForAdmin()`,
reading the same `effectiveScope` the route guards use, so the console can never
disagree with what the API would allow. Exports are the exception and throw 403,
because a file leaving the building should not be silently narrowed.

**Exports are described, not hand-written.** Six datasets × three formats is
eighteen code paths written by hand. A dataset declares its columns and its
query; one set of writers renders any of them. A seventh export is one object.

### Known limitations

- **The settings cache is per process.** A save invalidates it locally; with more
  than one backend instance, other instances take up to 60 seconds to notice.
  Acceptable for copy and colours — do not cache anything strongly consistent
  here.
- **Rotating `ADMIN_JWT_SECRET` without `SETTINGS_SECRET_KEY` set makes stored
  secrets undecryptable.** They fall back to `.env` rather than erroring, but
  they are gone. Set `SETTINGS_SECRET_KEY` in production and the two become
  independent.
- **Global search uses unanchored regex**, which is not index-eligible. Fine at
  this data size and capped per group; past a few hundred thousand rows the
  upgrade is Atlas Search, not `$text` (which tokenises on words and cannot match
  a fragment of a booking reference — the most common query here).
- **Exports are capped at 10,000 rows** and buffered rather than streamed, so a
  query failure produces a clean JSON error instead of a half-written file.
- **Feature toggles hide modules from the public site only.** They do not disable
  the API or the admin panel: turning off Restaurant should stop new reservations
  being taken, not strand the ones already in the book.
- **Maintenance mode is stored and served but not yet enforced by middleware** —
  the flag is public so the frontend can act on it; a server-side gate is a
  separate change.
- **Theme colours are stored but not yet injected as CSS variables.** The palette
  lives in `tailwind.config.js`, and wiring runtime colour overrides is a design
  system change, not a settings change.

### Environment variables added
- `SETTINGS_SECRET_KEY` — optional. Keys the AES-256-GCM encryption for settings
  secrets. Falls back to `ADMIN_JWT_SECRET`; see the limitation above. Example:
  `SETTINGS_SECRET_KEY=****************` (32+ random characters).

### Dependencies added
`exceljs`, `pdfkit`, `@types/pdfkit` — for Excel and PDF exports.

### Frontend
`frontend/src/lib/settings.ts` is the single reader. Every accessor takes a
fallback, and a **blank string counts as "not set"** so clearing a field restores
the built-in copy rather than emptying a heading. `flag()` is deliberately
asymmetric: only an explicit `false` hides a section, because a missing document
or an unreachable API must never blank the website.

`getSettings()` fetches with `no-store` and relies on React's `cache()` to
collapse every call in one render into a single request. The first version used
`cache: "force-cache"` *with* `next.revalidate`; Next refuses that combination
and force-cache wins, which pinned the first response forever and meant admin
edits never appeared. Freshness beats a saved round trip for a CMS.

Legal pages `notFound()` when unpublished — the one place that is right, where
`PropertyUnavailable` is used everywhere else. An empty policy is a deliberate
state, not an unreachable API, and a refund policy rendered as a friendly
placeholder is a legal claim nobody made.

### Full endpoint list
See `API_DOCUMENTATION.md`.

