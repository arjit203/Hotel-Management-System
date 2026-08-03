# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project governance (read first)

This repo has its own permanent instruction files that take precedence over generic defaults:

- **`RULES.md`** — FROZEN. Business + technical constraints (verticals, booking rules, payment gateway, multi-tenant mandate). Never edit. If a request conflicts with it, flag the conflict and ask before proceeding. Only an explicit "update RULES.md" from the owner may change it.
- **`AI_INSTRUCTIONS.md`** — PERMANENT. Governs *how* to work here: targeted diffs only (never regenerate a working file), module-by-module scope, mandatory doc updates paired with every code change, security/SEO/scalability rules.
- **`docs/PROJECT_DOCUMENTATION.md`** — living per-module record (design decisions, env vars, known limitations). Read the relevant module section before touching it.
- **`docs/CHANGELOG.md`** — append-only, newest on top, categories Added/Changed/Fixed/Security/Deprecated. Never rewrite prior entries.
- **`docs/API_DOCUMENTATION.md`** — the API contract; new/changed endpoints must be documented here.
- **`docs/DESIGN_SYSTEM.md`** — the public site's fonts, palette, type scale, component classes and motion primitives. **Read before writing any public-site UI**, especially for the Marriage Hall / Restaurant verticals, which must reuse this system rather than fork it. Two hard rules: nothing lighter than `warm-400` for text (WCAG AA), and nothing under 12px.

`AI_INSTRUCTIONS.md` also lists `FOLDER_STRUCTURE.md`, `DATABASE_SCHEMA.md`, `ENVIRONMENT_VARIABLES.md`, `PAYMENT_GUIDE.md`, `TESTING_GUIDE.md`, `DEPLOYMENT_GUIDE.md` as required pre-reads — **these files do not exist in the repo**. Say so rather than inventing their contents.

Practical consequences that come up constantly:
- Every feature change needs a matching CHANGELOG entry (+ PROJECT_DOCUMENTATION / API_DOCUMENTATION update if the API or a module's responsibilities changed). A code change without the doc update is considered incomplete.
- Never hardcode a single hotel/hall/branch ID or assume one property — models carry `branchId` and the backend stays multi-tenant even though only 1 property exists.
- No new top-level folders; new files go in the existing module/type slot.

## Commands

Run from the repo root (npm workspaces: `frontend`, `backend`, `admin-panel`):

```bash
npm run dev:all        # all three concurrently
npm run dev:frontend   # public site       → :3000
npm run dev:backend    # Express API       → :5000 (nodemon + ts-node)
npm run dev:admin      # admin panel       → :3001
npm run build:all      # backend tsc, then both Next builds
```

Per-workspace (`npm run <script> --workspace=backend|frontend|admin-panel`): `build`, `start`, `lint`, `format`, `test`.

Type-check without emitting: `cd backend && npx tsc --noEmit` (this is the usual backend verification step); for the Next apps, `next build` is the real check.

Seeders (root `npm run db:seed` is broken — `backend/package.json` has no `db:seed` script). Run both from `backend/`, which is where they resolve `.env` from:

```bash
# First Super Admin — connects to MongoDB directly.
cd backend && npx ts-node ../database/seeders/seed-super-admin.ts

# Demo content for all three verticals — needs the BACKEND RUNNING and admin credentials,
# because it writes through /api/v1/admin/* rather than connecting to MongoDB itself.
cd backend && npx ts-node ../database/seeders/seed-demo-content.ts \
  --email you@example.com --password yourpassword
```

`seed-demo-content.ts` is idempotent and deliberately never touches bookings, reservations, enquiries, users or any pricing field — see `docs/PROJECT_DOCUMENTATION.md` §9.

**Two traps that cost real time here, both worth knowing before writing another seeder:**
- **ts-node runs a `.ts` file only if it contains at least one `import` or `export`.** With none, it treats the file as a plain script and silently executes nothing — exit 0, no output, no error. `seed-demo-content.ts` carries a comment saying not to remove its imports.
- **`mongodb+srv://` needs a DNS SRV lookup**, which some networks refuse (`querySrv ECONNREFUSED`) even while ordinary DNS works and an already-connected backend keeps running. That is why the demo seeder goes through the API instead of Mongoose.

Health check: `GET http://localhost:5000/api/v1/health`.

**Admin UI gotchas that only surface at typecheck:** `Select` renders `children` (`<option>`), not an `options` prop; `Button`'s variants are `primary|secondary|ghost|danger|dangerGhost` — there is no `outline`; `useConfirm()` returns the function directly and its options use `danger: true`, not `tone`. Run `npx tsc --noEmit` per workspace.

**Grepping rendered HTML to verify a change:** `TextReveal` splits headings into per-word spans but sets `aria-label` to the full string, so heading greps work. JSX text next to an interpolation (`Last reviewed {value}`) does *not* grep as one string — React emits a comment node between them.

**Tests:** `test: jest` exists in all three `package.json` files but there are no test files and no jest config anywhere. Don't claim tests pass — per `AI_INSTRUCTIONS.md` §16, deliver manual test steps (expected result + edge cases such as double-booking, payment failure mid-flow) instead.

## Environment

Not tracked by git: `backend/.env`, `frontend/.env.local`, `admin-panel/.env.local`. Only `frontend/.env.example` and `admin-panel/.env.example` are committed — **there is no `backend/.env.example`**, so backend env vars are discoverable only from `docs/PROJECT_DOCUMENTATION.md` and the existing local `backend/.env`.

Backend vars actually read by code include `MONGODB_URI`, `PORT`, `JWT_SECRET`/`ADMIN_JWT_SECRET` (+ `*_EXPIRES_IN`), `SMTP_*`/`EMAIL_FROM`, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`, `CLOUDINARY_CLOUD_NAME`/`_API_KEY`/`_API_SECRET`, `MAX_IMAGE_UPLOAD_MB`, `HOTEL_ADVANCE_PAYMENT_PERCENT` (default 20), `CANCELLATION_FREE_WINDOW_HOURS` (default 24), `ADMIN_NOTIFICATION_EMAIL`, `FRONTEND_URL`, `ADMIN_PANEL_URL`, and `SETTINGS_SECRET_KEY` (optional — keys settings-secret encryption; falls back to `ADMIN_JWT_SECRET`, so rotating that without setting this makes stored secrets undecryptable). Any new var must be documented with purpose + masked example; never print real values.

Email and Cloudinary degrade gracefully when unset (email logs to console; upload routes return a clear "not configured" 500) — local dev works without them.

Several of these can now also be set from the admin panel's Settings → Integrations, which writes them into `process.env` at runtime. A DB value wins; a blank one leaves `.env` in charge.

## Architecture

Three apps, one MongoDB. The frontend/admin panel never touch the DB; they only call `/api/v1`.

### Backend (`backend/src`)

Vertical-sliced modules, strict layering — `routes → controller → service → model`:

```
modules/auth/     auth.routes|controller|service|validation.ts, models/{user,admin}.model.ts
modules/hotel/    hotel.routes|controller|service|validation.ts, booking.service.ts,
                  models/{hotel,room,roomAvailability,hotelBooking}.model.ts
modules/content/  content.service.ts, models/{review,gallery,faq,offer}.model.ts  ← shared, polymorphic
modules/settings/ settings.{service,controller,routes,validation,defaults,crypto}.ts, models/setting.model.ts
modules/audit/    audit.{service,controller,routes,validation}.ts, models/auditLog.model.ts
modules/console/  activity/notification/search/export services + console.{controller,routes}.ts
middlewares/      auth (authenticate/optionalAuthenticate/requireRole), audit, error, upload (multer memory)
utils/            apiError, token, email, razorpay, cloudinary
config/           db.ts (mongoose), cloudinary.ts
```

- **Controllers** parse+validate with Zod schemas from `<module>.validation.ts`, delegate to services, and `next(err)` everything to the central `errorHandler`. Services throw `ApiError(status, message)`; they never touch `req`/`res`.
- **Response envelope is universal:** `{ success, message?, data?, errors? }`. Zod failures return 400 with `errors: [{ field, message }]`.
- **Route mounting** (`server.ts`): `/api/v1/auth`, `/api/v1/hotels` (public), `/api/v1/hotel-bookings` (public), `/api/v1/admin/hotels` (admin). `errorHandler` must stay registered last.
- **Two independent actor types** (`user` | `admin`) with separate collections, separate JWT secrets, and separate expiry. `authenticate("admin")` rejects a user token even if otherwise valid. There is deliberately **no admin signup route** — admins are seeded/provisioned internally.
- **RBAC** is server-side only, via `requireRole(...)` after `authenticate`. Four roles: `super_admin`, `hotel_manager`, `restaurant_manager`, `hall_manager` (`branch_admin` and `staff` were removed 2026-08-03 — single branch, and no read-only tier was needed). Each module centralizes its own policy constant — `HOTEL_MANAGER_ROLES` / `RESTAURANT_MANAGER_ROLES` / `HALL_MANAGER_ROLES`, each `["super_admin", "<its>_manager"]` — so cross-vertical isolation falls out of the guard rather than needing special-casing. Change policy in the constant, not per-route.
- Admin accounts are managed at `/api/v1/admin/users` (`modules/auth/adminUser.*`), Super Admin only, guarded at the **router** level so a new route can't ship unguarded. `authenticate("admin")` re-reads the account from the DB each request, so demotion/deactivation is instant. `businessScope` is derived from the role and ignored if a client sends it. Accounts left on a removed role are flagged `isLegacyRole` and refused everywhere — don't let `ROLE_IMPLIED_SCOPE[role]` be read unguarded, that once 500'd the whole list endpoint.
- **Testing admin routes:** the admin routers have no bare `GET /`, so `/admin/hotels` returns 404 *before* `requireRole` runs — use a real endpoint (`/admin/hotels/bookings`) or your RBAC test proves nothing. `adminUser.routes.ts` uses `PUT`, and a 404 body has `success: false`, which reads as "blocked" to a check that only tests that flag. Assert on status codes.
- **Guest checkout is a hard requirement** (`RULES.md`: never force login). Booking, cancellation, and review routes use `optionalAuthenticate("user")`, which attaches `req.actor` when a token is present and silently proceeds otherwise. Ownership on such routes is proved by matching `guestEmail` or `userId` — a booking reference alone is never treated as authorization.
- **`content/` is polymorphic and vertical-agnostic** (`reviewableType`/`applicableTo` + owner id, e.g. `"hotel"`). Marriage Hall and Restaurant must reuse it rather than adding their own review/gallery/FAQ/offer models.
### Platform Settings, Audit, Console (Phase 5)

- **Settings** (`/api/v1/settings` public, `/api/v1/admin/settings` Super Admin) — 15 categories, one Mongo document each, `values` schemaless. Reads merge the stored doc over `SETTING_DEFAULTS`; unknown keys are dropped on write, not rejected. **Every default is a word-for-word transcription of what the page rendered before** — an unconfigured install must look identical, so don't "improve" a default.
- **Secrets are write-only.** AES-256-GCM, returned only as a `••••••••1234` mask. Blank = keep, `"__clear__"` = delete. Never put a secret in `values`; that's what the separate `secrets` map is for. `SETTINGS_SECRET_KEY` (optional) keys it, falling back to `ADMIN_JWT_SECRET` — rotating that secret without the dedicated key makes stored secrets undecryptable (they fall back to `.env`, they don't throw).
- **Integrations reach Razorpay/Cloudinary/SMTP via `process.env`.** All three utils read env lazily at call time, so `applyIntegrationEnv()` (boot + after every save) delivers DB values without touching them. Blank values are skipped so `.env` stays the fallback. Don't convert those utils to read the DB directly.
- **Audit logging is a middleware, never a service call.** `auditLogger()` mounts on each admin router *after* `authenticate` and hooks `res.on("finish")` — it covers routes that don't exist yet, and logs only 2xx mutations. Don't add `audit.record()` calls to controllers; the two exceptions (login, failed login) are in `auth.controller.ts` because login has no token yet. Audit is read-only with no write endpoint — keep it that way.
- **The activity feed is derived from the source collections, not stored.** Writing an `Activity` row per event would mean editing `createHotelBooking`/`verifyPayment`/`createReservation`/`createEnquiry`. Notifications are the notification-worthy subset of that same feed plus per-admin read state; only the *read* half persists, and "mark all read" is one watermark document.
- **`/api/v1/admin/console/*` deliberately has no `requireRole`** — those features are *scoped*, not restricted, via `scopeForAdmin()` inside the services. Every role needs a dashboard and a bell; they just contain different data. Exports are the exception and 403 outside your scope.
- **Public site reads settings through `frontend/src/lib/settings.ts`.** A blank string counts as "not set" (so clearing restores built-in copy), and `flag()` only hides on an explicit `false` (so a dead API can't blank the site). It fetches `no-store` — passing `cache: "force-cache"` alongside `next.revalidate` makes Next pin the first response forever and admin edits never appear.
- **Media**: all uploads go through `upload.middleware.ts` (multer *memory* storage — never disk) into `utils/cloudinary.util.ts` (`uploadImageBuffer`/`deleteImageByPublicId`). Models store the returned `secure_url` as a plain string in `imageUrl`/`images`; don't restructure those fields to hold upload metadata. Server-side `quality: auto:good, fetch_format: auto` is intentional.

### Availability & booking model (the non-obvious core)

- `RoomAvailability` holds **manual admin overrides only** (e.g. block 3 Deluxe rooms for maintenance), not one row per room per day. Bookable count is computed on read in `hotel.service.ts`: `totalRooms − manuallyBlocked(date) − overlappingActiveBookings(date)`, where dates are normalized to midnight UTC and overlap is half-open `[checkIn, checkOut)`. There is no availability pre-generation job.
- A `HotelBooking` holds a **`rooms[]` array** — one booking can span several room categories under one `bookingReference` (`7V-XXXXXXXX`), one payment, one email. Queries filter on `"rooms.roomId"`, not a top-level `roomId`.
- **Payment flow:** `createHotelBooking` → status `pending` + Razorpay order for `advanceRequired` (`HOTEL_ADVANCE_PAYMENT_PERCENT`) → `POST /hotel-bookings/verify-payment` verifies the Razorpay **signature** → status `confirmed`, `paymentStatus: paid`, confirmation email sent. Never confirm a booking or send that email from a client-reported success; signature verification is the only proof. Replay is blocked by requiring status `pending`.
- **Cancellation** refunds via Razorpay when within `CANCELLATION_FREE_WINDOW_HOURS`; a failed gateway refund falls back to `refund_pending` for manual follow-up rather than failing the cancellation.
- **Known limitation, do not "fix" locally:** availability check and booking creation are not transactional, so concurrent last-room requests can double-book. This is deliberately deferred to the future shared Booking Engine module (`docs/PROJECT_DOCUMENTATION.md`), not to be patched inside Hotel alone.
- Hotel bookings are **instant** (no approval). Marriage Hall, when built, requires admin approval before payment — don't copy Hotel's flow verbatim.
- Hotel/Room deletion is a **soft delete** (`isActive: false`) and is blocked when dependent active rooms/bookings exist.

### Frontend (`frontend/src`) — public site, Next.js 14 App Router

- Pages under `app/hotel/*` are **Server Components** fetching through `lib/hotel.ts`; interactive pieces are separate `"use client"` components. A stray event handler on a server component breaks every page in the app — this has happened before (see CHANGELOG 2026-08-01).
- **`lib/hotel.ts` `getTheHotel()`** is the single place encoding "there is one property": it lists `/hotels` and auto-selects the first active slug. The backend stays multi-hotel; when a second property appears, this function is the only thing to change.
- `lib/api.ts` is a thin `fetch` wrapper returning `ApiResponse<T>`, defaulting to `cache: "no-store"`.
- Customer auth token lives in `lib/userAuth.ts` (separate storage from the admin panel's — different actor type and JWT).
- SEO is a hard requirement per `AI_INSTRUCTIONS.md` §9: every public page needs unique metadata via `generateMetadata`/`metadata`, plus `app/sitemap.ts`, `app/robots.ts`, `Breadcrumbs.tsx` (visible trail + JSON-LD `BreadcrumbList`), `HotelSchema.tsx` (JSON-LD `Hotel`), and alt text on images. Public pages must render server-side.
- Legacy URLs are preserved via `redirects()` in `next.config.js` (`/booking-confirmation/:ref`, `/hotel/rooms/:slug/book`). Keep adding redirects rather than breaking shared links.
- Tailwind design system: `ink`/`gold`/`cream` palette in `tailwind.config.js` plus `.section-title`/`.btn-primary`/`.btn-outline` in `globals.css`. Deliberately a system-font stack — no external font CDN. Components are responsive by default.

### Admin panel (`admin-panel/src`) — Next.js 14, port 3001

- `lib/api.ts` (`adminApi`) attaches `Bearer` from `localStorage` (`admin_token`), redirects to `/login` globally on any 401, and exposes `formatApiError()` (surfaces per-field validation errors) and `uploadImage()` (multipart — must *not* set a JSON content type). Reuse these; don't reimplement.
- `RequireAdmin.tsx` gates pages client-side. That's UX only — authorization is always enforced again server-side.

## Working notes

- Backend `tsconfig.json` is CommonJS with `rootDir: src` → `dist`; the Next apps use `@/*`, `@components/*`, `@modules/*` path aliases. `frontend/tsconfig.json` carries `"ignoreDeprecations": "6.0"`, which has previously required a workaround to get `next build` through (CHANGELOG 2026-07-31 b).
- Backend currently has both a shared `utils/apiError.util.ts` `ApiError` and a legacy local one inside `auth.service.ts`. Known tech debt; unifying them is a separate explicit request, not a drive-by refactor.
- Rate limiting is required on public-facing forms; auth routes use a 20-req/15-min limiter in `auth.routes.ts` as the pattern to follow.
- Restaurant online ordering is Phase 2 — UI placeholders only, no transactional ordering backend.
