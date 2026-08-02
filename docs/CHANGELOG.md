# CHANGELOG.md — 7 Vachan

Format: newest entries on top. Categories: Added / Changed / Fixed / Security / Deprecated.

---

## [2026-08-02 (c)] — Phase 4.0: Restaurant module — backend

**Hotel module untouched.** No Hotel model, service, controller, route, API contract, payment or auth code was modified. `server.ts` gained three additive `app.use` mounts on non-overlapping namespaces; `email.util.ts` gained two additive exports. Everything else is new files under `backend/src/modules/restaurant/`.

Scope per `RULES.md` §2: table reservation is **instant**, online food ordering is **Phase 2**. There is deliberately **no cart, order, checkout, delivery or food-payment code anywhere in this module**.

### Added
- **Models** (`backend/src/modules/restaurant/models/`) — `restaurant`, `menuCategory`, `menuItem`, `diningArea`, `tableAvailability`, `tableReservation`. All mirror the Hotel module's conventions (`branchId` multi-tenancy, slug scoping, `isActive` soft delete, midnight-UTC dates).
- **`restaurant.validation.ts`** — Zod schemas for every route, including a shared `HH:MM` time validator and a `menuQuerySchema` that backs search, veg/non-veg, price filters and the specials flags from one place.
- **`restaurant.service.ts`** — restaurant/menu/dining-area CRUD, `getAvailableTables`, `getDayAvailability` (the Table Availability grid), `tablesNeededFor`, admin availability overrides.
- **`reservation.service.ts`** — instant `confirmed` creation, reference generation (`7VR-` prefix), lookup, user list, admin list, status update, guest-initiated cancellation with an ownership check.
- **`restaurant.controller.ts`** and **`restaurant.routes.ts`** — three routers matching the Hotel module's split: public content, public reservations, admin.
- **`email.util.ts`** — two additive builders: `buildReservationConfirmationEmailHtml`, `buildReservationCancellationEmailHtml` (the latter has a `forAdmin` variant). No existing builder changed.
- **`API_DOCUMENTATION.md`** — three new sections (Restaurant Public / Table Reservations / Admin), 182 lines, covering every endpoint with request shapes, error codes, RBAC matrix and the availability formula.

### Reused, not rebuilt
- **`content.service.ts` wholesale** for reviews, gallery, FAQs and offers. Its models already accepted `"restaurant"` in their polymorphic enums, so **zero model changes were required** — only routes. There are no restaurant-specific copies of those four features.
- `auth.middleware` (`authenticate`, `optionalAuthenticate`, `requireRole`), `apiError.util`, `cloudinary.util`, `upload.middleware`, `email.util`, `db` config — all imported, none duplicated.
- **No new npm packages. No new environment variables.**

### Design decisions worth knowing
- **`DiningArea` is the availability unit, not individual tables.** Reservations count against `totalTables`; the host assigns actual tables on the floor. Modelling individual tables would encode a precision the business doesn't operate at.
- **`TableAvailability` stores manual overrides only** — same decision as `RoomAvailability`. Availability is computed on read: `totalTables − blocked(day-wide + slot) − Σ tablesReserved(confirmed|seated)`. No pre-generation job.
- **A party occupies `ceil(partySize / area.maxPartySize)` tables** — a party of 10 in a 4-seat area consumes 3.
- **`reservationSlots` and `serviceHours` are admin-configured data**, not a hardcoded interval (`AI_INSTRUCTIONS.md` §15). The service rejects a slot the restaurant doesn't offer.
- **Menu search uses an escaped regex, not the `$text` index.** MongoDB can't combine `$text` with a sort on another field efficiently, and guests expect partial-word matches ("pane" → "Paneer"). The text index stays on the model for future use.
- **`TableReservation` has no amount/advance/Razorpay/invoice fields**, with a comment saying not to add them without a rules change.
- **Reference prefix `7VR-`** distinguishes a restaurant reservation from a hotel booking's `7V-` at a glance.
- **`contentService.createOffer` was NOT extended** to accept `discountPercent` — changing that signature would alter a contract the completed Hotel module depends on. The restaurant controller calls it with exactly the field set the Hotel controller uses.

### Verification — what was actually exercised
`tsc --noEmit` → 0 errors. `tsc -p tsconfig.json` → build succeeds, `dist/modules/restaurant/` emitted. Server booted against the live database and the following were run as real HTTP requests:

**Hotel regression (unaffected):** `/health` 200 · `/hotels` 200 · `/hotel-bookings/reference/NOPE` 404

**Validation layer:** empty reservation body → 400 with per-field errors · `timeSlot: "7pm"` → 400 "must be 24-hour HH:MM" · `minPrice=900&maxPrice=100` → 400 "minPrice cannot be greater than maxPrice." · availability without `date` → 400

**Service layer:** nonexistent restaurant → 404 · unknown slug → 404 · unknown reservation reference → 404

**Auth/RBAC:** cancel without email or login → 400 identity guard · `/table-reservations/me` without token → 401 · admin route without token → 401 · admin route with garbage token → 401

**End-to-end, against the live database** (admin credentials supplied after the first pass; test data created and fully removed afterwards):

| Flow | Result |
|---|---|
| Create restaurant → category → 3 menu items → 2 dining areas | all 201 |
| Menu search `pane` | matched "Paneer Tikka" — partial-word matching confirmed |
| Menu search `bestseller` | matched via `tags` |
| `foodType=veg` / `non_veg` | 2 / 1 |
| `minPrice=200&maxPrice=450` | 1 of 3 (180 and 520 correctly excluded) |
| `sortBy=price_asc` | 180 → 420 → 520 |
| Chef Specials / Today's Specials | 1 each, correct items |
| Page aggregate | all 11 keys populated |
| Availability grid | Main Hall 2 tables/slot; Private Dining `canSeatParty:false` for a party of 4 (its `minPartySize` is 6) |
| Closed weekday | 409 "…is closed on that day." |
| Unconfigured slot `21:00` | 400, listing the configured sittings |
| Party below area minimum | 400 |
| **Reserve party of 6** | `tablesReserved: 2` — `ceil(6/4)` confirmed; status `confirmed`; ref `7VR-…` |
| Availability after booking | 2 → **0** |
| Overbook attempt | 409 "fully booked at 19:30" |
| Cancel with wrong email | 403 ownership guard |
| Cancel with correct email | 200, status `cancelled` |
| Availability after cancel | 0 → **2** (tables released) |
| Double cancel | 409 already cancelled |
| Admin availability override | 2 → 0 blocked; over-block rejected ("only has 2") |
| Delete category holding items | 409 guard |
| Delete restaurant with areas | 409 guard |
| Cleanup + Hotel regression | all removed, `/restaurants` empty, `/hotels` still 200 |

### Notes / Known Limitations
- **Reservation race condition** — the availability check and the insert are not one transaction, so two simultaneous requests for the last table could both succeed. Identical to the Hotel booking race and deliberately deferred to the same shared **Booking Engine** hardening item, so both verticals get one fix.
- **No Restaurant admin-panel UI** — the admin APIs exist, the `admin-panel` pages do not. Same position Hotel was in after its backend phase.
- **Restaurant frontend not started.**

---

## [2026-08-02 (b)] — Phase 3.9: Shared component extraction & design-token module (frontend only)

**Numbering note:** the owner's brief labelled this "Phase 3.8", but 3.8 was already taken by the entry below (design system + motion layer, same day). Recorded as 3.9 so the two remain distinguishable; they are consecutive parts of the same effort.

**No backend, API, database, business-logic, payment, authentication, routing or SEO changes.** No new UI, no redesign. This entry is pure de-duplication and code organisation.

**Net effect: 18 files changed, 146 insertions, 375 deletions (−229 lines).**

### Added
- **`frontend/src/lib/theme.ts`** — design tokens for TypeScript consumers: `COLORS`, `FONTS`, `EASE`, `DURATIONS`, `INTERVALS`, `BREAKPOINTS` + `mediaUp()`, `LAYOUT`, `RADII`, `SHADOWS`, plus the greppable guard-rails `MIN_TEXT_COLOR` / `MIN_FONT_PX` / `MIN_BODY_FONT_PX`. `components/motion/variants.ts` now re-exports its easing and duration scale from here, so there is one definition. Documented in-file that this **mirrors** `tailwind.config.js` (which stays the source for CSS utilities) and that the two must be edited together — Tailwind's config is CommonJS and `allowJs` is false, so importing across is not possible without a tsconfig change, which was out of scope.
- **`frontend/src/lib/format.ts`** — `money`, `amount`, `formatDate`, `formatDateLong`, `formatDateShort`, `nightsBetween`, `todayISO`, `initial`. `nightsBetween` deliberately mirrors the backend's `calculateNights` so a displayed night count can never disagree with the charged one.
- **`frontend/src/components/ui/`** (new subfolder — six components, each extracted from real duplication, none speculative):
  - `Lightbox.tsx` — was implemented **three times** (GalleryGrid, GalleryPreview, RoomImageGallery), and the copies had already drifted (differing aria labels, one missing the scroll lock). Now also restores the previous `body.overflow` value instead of blanking it, so a nested lock can't be clobbered.
  - `Alert.tsx` — was hand-written **five times**; `variant="dark"` covers the auth card, where the light-surface red was unreadable.
  - `Pagination.tsx` — byte-identical markup in RoomSearch and ReviewsList.
  - `StatusBadge.tsx` — the eight-status `STATUS_STYLES` map was duplicated in the confirmation page and my-bookings. The vocabulary is owned by the backend (`updateBookingStatus`), so it must render identically everywhere.
  - `EmptyState.tsx` — five variations across my-bookings, offers, amenities and gallery.
  - `Monogram.tsx` — duplicated in Testimonials and ReviewsList.
- **`.field-line` / `.field-line-sm`** in `globals.css` — the underline-input class string was copy-pasted as a local `fieldClass`/`inputClass` const in five components.

### Changed
- Wired all of the above into their existing call sites; no component gained a new prop contract and no page changed structure.
- `components/motion/variants.ts` — `EASE_LUXE` / `DURATION` are now aliases of `lib/theme`'s `EASE` / `DURATIONS`. Names kept because every motion component already imports them.
- `docs/DESIGN_SYSTEM.md` — new §5b (shared UI primitives) and §7b (formatters and tokens); the new-vertical checklist in §9 extended.

### Fixed
- `@apply border-ink/12` **failed the build** (`The border-ink/12 class does not exist`). Arbitrary opacity modifiers work in a JIT-scanned `class` attribute but not inside `@apply`; corrected to `border-ink/[0.12]`, which compiles to the identical `rgba(20,18,15,.12)`.
- `Monogram` adds `aria-hidden="true"` — the initial is decorative and was previously announced to screen readers immediately before the guest name it duplicates.

### Verification — how "zero visual difference" was actually checked
Not asserted; measured. The prerendered HTML of all 14 static routes was captured **before** the refactor, then re-captured after and diffed with build artefacts (chunk hashes, font-variable hashes, RSC payload) normalised out:

- **11 of 14 routes: byte-identical DOM.**
- 3 routes differ, each fully accounted for:
  - `index.html`, `hotel/reviews.html` — Monogram only: same class set in a different order, plus the new `aria-hidden`. No computed-style change.
  - `hotel/contact.html` — `class="block w-full border-0 border-b border-ink/12 …"` → `class="field-line"`. Equivalence confirmed against the **compiled** stylesheet: `border-color:rgba(20,18,15,.12)`, `padding:.625rem`, `font-size:1rem`, `font-weight:300` — the same declarations the utility string produced.
- `tsc --noEmit` → 0 errors. `next build` → 19/19 routes, 0 errors. Shared First Load JS unchanged at 87.3 kB.

### Notes / Known Limitations
- **One intentional pixel change, disclosed:** `RoomAvailabilityCheck`'s date inputs previously used `py-2` + `border-ink/15`; they now use the shared `.field-line-sm` (`py-2.5` + `/12`). That is 2px of vertical padding and a slightly lighter hairline. Standardising inconsistent values necessarily changes whichever value was the outlier — flagged rather than buried.
- **No components were relocated.** The brief asked for components to be moved into shared folders, but the layout was already correct: `components/` is the shared surface, `modules/hotel/components/` is hotel-specific. Moving files like `Hero` or `Testimonials` would have produced import churn across every page for no functional gain, against a "zero difference" requirement. `Hero`, `Testimonials`, `GalleryPreview` and `WhyChooseUs` are generic enough to reuse **from their current paths**; see DESIGN_SYSTEM.md §9.
- **No speculative components were created.** The brief listed ~25 candidates (Navbar, Modal, Toast, Select, Textarea, Feature Card, …). Only the six with proven duplication were extracted. Building the rest with no consumer would add untested dead code and contradict "do not create new UI" — they should be extracted when a second vertical actually needs them.
- **Still no browser verification.** The HTML diff is strong evidence of unchanged markup, but no page has been opened in a browser, and hover/scroll/lightbox interactions are unverified at runtime.
- `text-[11px]` remains in several components, below the 12px floor documented in DESIGN_SYSTEM.md §2. Correcting it is a visual change and was therefore out of scope for this phase.

---

## [2026-08-02] — Phase 3.8: Luxury design system, motion layer & UX refinement (frontend only)

**No backend, API, database, business-logic, payment, routing, or admin-panel changes.** Every API call, request shape, query parameter and destination route is byte-for-byte unchanged. This entry is presentation, accessibility and UX only.

### Added
- **Design tokens** (`frontend/tailwind.config.js`): fluid display type scale (`display-sm/md/lg/xl` via `clamp()`), `tracking-eyebrow`/`tracking-luxe`, `shadow-lift`/`shadow-gold`, `rounded-luxe`/`rounded-airy`, `ease-luxe` easing, `max-w-content`, and `ken-burns`/`shimmer`/`scroll-hint` keyframes. New `ink.soft`, `gold.pale`, `cream.deep` shades added **additively** — no existing token value was repurposed.
- **Typography pairing** (`frontend/src/app/layout.tsx`): Cormorant Garamond (display) + Jost (body) via `next/font/google`, exposed as `--font-display` / `--font-sans`. See the reversal note below.
- **Motion layer** (`frontend/src/components/motion/`, new folder): `Reveal`, `Stagger`/`StaggerItem`/`StaggerScaleItem`, `TextReveal` (word-mask headline reveal), `Parallax`, `LuxeImage` (skeleton → fade-in, hover zoom), `PageTransition` (route entrance), `ScrollProgress`, `AnimatedNumber`, and a shared `variants.ts` timing vocabulary. All respect `prefers-reduced-motion`; all animate only `opacity`/`transform`.
- **`docs/DESIGN_SYSTEM.md`** (new) — the design system's reference document: font pairing, colour tokens with measured contrast ratios, type scale, layout rhythm, component classes, the motion vocabulary and its rules, imagery handling, and a checklist for building the Marriage Hall / Restaurant front-ends against the same system. Cross-referenced from `CLAUDE.md` and `PROJECT_DOCUMENTATION.md`.
- **Shared UI**: `components/PageHeader.tsx` (one header treatment for every sub-page, emits breadcrumb JSON-LD), `components/Skeleton.tsx` (route-level loading placeholders), and `loading.tsx` for `/hotel/rooms`, `/hotel/gallery`, `/hotel/rooms/[roomSlug]` (Next convention files — **no new routes**).
- **Auth experience** (`frontend/src/components/auth/`, new folder): `AuthShell` (full-screen split layout with Ken-Burns property photography), `FloatingField` (floating-label underline input, CSS-driven), `SocialPlaceholders`, `LoginForm`, `SignupForm`. Adds password visibility toggle, Remember Me, an inline forgot-password mode, and a live password-rule checklist mirroring `auth.validation.ts`.
- **Booking confirmation invoice**: letterhead, stay summary, per-room charge lines, advance/balance breakdown, `InvoiceActions` (Print / Save as PDF, Email a copy, Copy reference), `BookingSuccessMark` (drawn-ring success animation), and a `@media print` stylesheet so the page prints as a standalone document.
- `frontend/.env.example` gains no new **required** vars; `NEXT_PUBLIC_HERO_VIDEO_URL` is read by `Hero.tsx` as an **optional** background-video source (the hero works fully without it).

### Changed
- **Contrast (accessibility fix)**: the `warm` palette was `#a1978b`/`#8a7f72`/`#6f6558`, measuring **2.4:1 and 3.6:1** against the cream background — both **fail WCAG AA** for body text. Darkened to `#6f6558`/`#5c5449`/`#4a433a` (**5.3:1 / 6.5:1 / 8.1:1**). Fixed at the token level, so every consumer improved at once.
- **Type scale**: body base set to 16px/1.7; `.lead`, `.body-muted`, `.card-title`, button text (14px) and nav text (14px) all increased; `.field-label` 10px → 11px.
- **Footer**: rebuilt from a 5-column ~700px block into a 3-column row plus a one-line legal bar (**~275px desktop**). Removed the full-width reservation CTA band and the duplicated link tree.
- **Header**: fixed-position with auto-hide on scroll-down / reveal on scroll-up, transparent over the home hero only, height shrinks on scroll, breakpoint for the full nav moved `lg` → `xl` (nine links plus a CTA was cramped below that), animated underlines, full-screen mobile drawer with scroll lock.
- **Breadcrumbs**: the visible grey trail is off by default; the component's job is now the `BreadcrumbList` JSON-LD, which is preserved everywhere (SEO requirement, `AI_INSTRUCTIONS.md` §9). Pages pass `crumbs` to `PageHeader`. Pass `visual` to render a trail.
- **Rebuilt presentation** (logic untouched): `Hero` (hand-built crossfade + Ken Burns, replacing the Swiper slider — Swiper is still used by `Testimonials`), `QuickBookingWidget` (frosted panel, guest stepper), `RoomCard` (single stretched link, hover zoom, counting rate), `RoomSearch` (drawer filters, skeletons during search), `GalleryGrid`/`GalleryPreview` (editorial mosaic, keyboard-navigable lightbox), `FaqAccordion` (height-animated), `RoomImageGallery` (crossfade, full-screen view), `Testimonials`, `ReviewsList`, `StarRating` (true partial fills instead of rounding), `MapPlaceholder`, `NewsletterForm`, `Footer`, all nine `/hotel/*` pages, `BookingForm` (continuous animated step rail, per-step transitions), `/login`, `/signup`, `/my-bookings`, `/verify-email/[token]`, `ContactForm`, `ReviewForm`, `RoomAvailabilityCheck`.
- `lib/userAuth.ts`: `setUserToken`/`setStoredUser` accept a `remember` flag choosing `localStorage` (persist) vs `sessionStorage` (clear on close); reads check both. **This is a client-side storage choice only** — token issuance and lifetime remain entirely server-side (`JWT_EXPIRES_IN`). Also hardened `getStoredUser()` against a corrupted entry throwing.
- `lib/hotel.ts`: `HotelDetailsData.hotel` gains optional `checkInTime`/`checkOutTime`. The API has always returned these (`hotel.model.ts` defines both with defaults); the type was simply narrower than the response.
- `ReviewForm` no longer renders its own card — the Reviews page already wraps it, which produced a double frame.

### Fixed
- **`frontend/tsconfig.json` — `"ignoreDeprecations": "6.0"` made `next build` fail outright** with `Invalid value for '--ignoreDeprecations'` under the project's TypeScript 5.5. This is the defect the 2026-07-31 (b) entry worked around with a temporary tsconfig copy. Root cause: newer editor TypeScript deprecates `baseUrl` and suggests that flag, but TS 5.5 rejects the value. Fixed properly by removing `baseUrl` and making `paths` self-relative (`./src/*`), which both TS versions accept. **The frontend now builds without any workaround.**
- Buttons: `@apply btn-base` silently dropped the `::before` sheen and `isolation`, because `@apply` copies utilities only — not a class's pseudo-element rules or raw declarations. Rewritten as a grouped selector.

### Security
- No change to authentication, authorization, payment verification or any server-side validation. Social sign-in buttons are rendered **disabled** rather than wired to a non-existent OAuth flow.

### Notes / Known Limitations (flagged, not silently worked around)
- **Reference material**: this phase was specified in writing only. A video reference and sample images were mentioned but never reached the session, so the motion and login/signup styling follow the written brief rather than a supplied reference.
- **`DATABASE_SCHEMA.md` and `FOLDER_STRUCTURE.md` do not exist in the repository**, despite `AI_INSTRUCTIONS.md` §0 listing both as mandatory pre-reads. Stated rather than assumed. `ENVIRONMENT_VARIABLES.md`, `PAYMENT_GUIDE.md`, `TESTING_GUIDE.md` and `DEPLOYMENT_GUIDE.md` are likewise absent.
- **"Download Invoice (PDF)" is served by `window.print()`**, not a generated PDF file. There is no invoice endpoint server-side, and a client-side generator (jsPDF/html2canvas) is ~200KB of JS on a render-once page, which conflicts with the performance requirement. Every desktop browser offers "Save as PDF" as a print destination, so one honestly-labelled button covers both. A true PDF needs a backend endpoint.
- **"Email Invoice" is a `mailto:`, not a server-side resend.** The backend emails the confirmation exactly once inside `verifyPayment()` (`booking.service.ts`) and exposes no resend/invoice route. A real resend requires a new endpoint — out of scope.
- **Newsletter signup still has no backend.** It validates and acknowledges locally; it does not persist. Unchanged from the previous phase, but now explicit in the component.
- **Contact form still submits via WhatsApp** — no contact endpoint exists. Unchanged; the button now says so.
- **Bundle cost**: `framer-motion` adds roughly 40–50KB gzip and, because reveals are used site-wide, it loads on nearly every route. First Load JS is now 142–188KB per page (shared chunk 87.3KB). A `LazyMotion` + `m` + `domAnimation` conversion would cut roughly 13KB from every page — the only blocker is `layoutId`, which has already been removed from `GalleryGrid` in preparation. **Started this phase, interrupted, not completed.** Recommended as the first task of the next pass.
- **Not verified in a browser.** `next build` passes with 0 errors across all 19 routes and types check clean, but no runtime, visual, cross-browser or Lighthouse verification was performed in this session. The responsive behaviour is written to the breakpoints, not observed at them. See the testing checklist handed over with this phase.

---

## [2026-08-01] — Phase 3.7: Hotel Public Website (multi-page, premium UI)

### Added
- **Design system**: Tailwind palette (`ink`/`gold`/`cream`), reusable classes (`.section-title`, `.btn-primary`, `.btn-outline`) in `globals.css` + `tailwind.config.js`. Premium system-font stack (no external font CDN dependency — more robust than `next/font/google` for production).
- **New pages** (all under `frontend/src/app/hotel/`, all server components fetching via existing `getTheHotel()`/`getTheHotelRoom()` — **no backend or database changes**):
  - `/hotel/about` — brand story, vision/standard/promise
  - `/hotel/rooms` — dedicated listing page (filters, sort, client-side pagination — reuses existing `GET /hotels/:slug/rooms/search`)
  - `/hotel/gallery` — category tabs + full lightbox (prev/next navigation)
  - `/hotel/offers`, `/hotel/amenities`, `/hotel/reviews` (paginated + write-review form), `/hotel/faqs` (with search — see Notes), `/hotel/contact` (WhatsApp-based submission — see Notes)
  - `/hotel/booking` — new primary booking route (`?room=<slug>` preselects a room); replaces the old per-room `/hotel/rooms/:slug/book` route
  - `/hotel/booking/confirmation/:reference` — moved from `/booking-confirmation/:reference`
- **Home page (`/`)**: full rebuild — Hero (Swiper image slider + video-banner placeholder), Quick Booking Widget, Featured Rooms, Why Choose Us, Amenities/Offers/Gallery previews, Testimonials (Swiper carousel) + Google Reviews placeholder, Map.
- **`/hotel`**: restyled from the old single-page monolith into a premium overview hub linking out to the new dedicated sub-pages.
- **SEO**: `app/sitemap.ts`, `app/robots.ts`, `components/Breadcrumbs.tsx` (renders visible trail + JSON-LD `BreadcrumbList` together, added to every sub-page), `components/HotelSchema.tsx` (JSON-LD `Hotel` schema on `/hotel`), per-page `generateMetadata`/`metadata` (title, description, canonical, Open Graph) across all new pages.
- **Room Details**: added Related Rooms, a Reviews teaser (hotel-wide — see Notes on per-room review limitation), and a Room Availability checker (`RoomAvailabilityCheck.tsx`, reuses the existing single-room availability endpoint).
- New shared components: `Footer.tsx`, `NewsletterForm.tsx`, `RoomImageGallery.tsx`, `RoomAvailabilityCheck.tsx`, `ContactForm.tsx`, `ReviewsList.tsx`, `lib/amenityIcons.tsx` (amenity-name → Lucide icon mapping, shared across Amenities Preview and the full Amenities page).
- `lucide-react@0.383.0` added to `frontend/package.json` (matches the version already used in `admin-panel`) — every icon used was verified against this installed version before use.
- Redirects (`next.config.js`): `/booking-confirmation/:reference` → `/hotel/booking/confirmation/:reference`, `/hotel/rooms/:roomSlug/book` → `/hotel/booking?room=:roomSlug` (for any old bookmarked/shared links).

### Changed
- Restyled with Tailwind (previously inline `style={}`): `Header.tsx` (sticky, scroll-aware, mobile drawer), `RoomCard.tsx`, `StarRating.tsx` (now uses Lucide `Star`), `MapPlaceholder.tsx`, `GalleryGrid.tsx` (added category tabs + full lightbox), `FaqAccordion.tsx` (added search), `RoomSearch.tsx` (added client-side pagination + auto-search from Quick Booking Widget's URL params), `ReviewForm.tsx`, `CancelBookingButton.tsx`, `BookingForm.tsx` (added step indicator; logic unchanged).
- Applied (previously only described in chat, not in the actual codebase): Razorpay Checkout script now loads on-demand inside `BookingForm.tsx` rather than via a `next/script` tag, and `config_id` support was added for custom Razorpay payment configurations.

### Fixed
- **`Footer.tsx` (new in this phase) initially had an `onSubmit` handler on a `<form>` inside a Server Component (no `"use client"`) — this broke every single page in the app** ("Event handlers cannot be passed to Client Component props"). Fixed by extracting the newsletter form into its own `NewsletterForm.tsx` Client Component. Caught by this session's own build verification before being delivered.

### Notes / Known Limitations (flagged, not silently worked around)
- **Per-room reviews are not supported by the data model** (reviews are hotel-level — `reviewableType/reviewableId` on `Review`, not room-level). Room Details' "Reviews" section shows the hotel's overall reviews as a teaser with a link to `/hotel/reviews`, rather than fabricating room-specific data. A schema redesign would be needed to properly support this — out of scope per "do not change database."
- **FAQ "Categories"** (from the original brief) is not implemented — `faq.model.ts` has no category field, and adding one is a database change outside this phase's scope. Search (client-side, over existing question+answer text) is implemented instead, fully supported by existing data.
- **Contact Form** has no dedicated backend endpoint (none exists in this phase's API surface). Submitting opens a pre-filled WhatsApp chat to the hotel's number (`NEXT_PUBLIC_WHATSAPP_NUMBER`, already reserved in `.env.example`) instead of silently doing nothing or requiring an unbuilt endpoint.
- **Video Banner** on the Home page's Hero is a placeholder button only (brief explicitly says "placeholder") — no actual video asset/player wired in.
- **Google Fonts** (`next/font/google`, initially used for `Playfair Display`/`Manrope`) was replaced with a system-font stack after repeated build failures in this session's sandbox due to network restrictions reaching `fonts.googleapis.com`. This is arguably a better production choice regardless (no external font-CDN dependency/latency), but flagging the substitution since it wasn't explicitly requested.
- Verified throughout: every page's build was checked after being added (`next build`, 0 errors at each step — 19 routes compile cleanly in the final state).

---

## [2026-07-31 (c)] — Fix: Email verification always failed on first click (StrictMode double-effect bug)

### Fixed
- `frontend/src/app/verify-email/[token]/page.tsx` — `useEffect` fired the verify API call twice in development, because `next.config.js` has `reactStrictMode: true` (intentional React 18 dev behavior — mounts effects twice to surface side-effect bugs). The backend's verification token is single-use (`emailVerificationToken` is cleared immediately after a successful verify in `auth.service.ts`'s `verifyUserEmail`), so the first call succeeded but the second call — same token, now already cleared — always failed with "Verification link is invalid or has expired." Since the effect had no guard, the second (failing) response overwrote the first (successful) one, and the user always saw the failure message regardless of whether verification actually succeeded.
- Fix: added a `useRef` guard so the verify request only ever fires once per page load, regardless of StrictMode's double-invocation.

### Notes
- No backend change — the single-use-token behavior is correct and intentional; the bug was purely in how the frontend called it.
- This means any account created before this fix, where the person saw "invalid or expired" on their first click, is likely **already verified** on the backend despite the error shown — worth confirming via `GET /auth/user/me` or the admin's user list rather than assuming those signups failed.
- Verified: `next build` — 0 errors, all 9 routes compile.

---

## [2026-07-31 (b)] — Customer Login/Signup (frontend) + Review system completion (write form, guest+logged-in support)

### Added
- **Frontend — Customer auth (new):** `frontend/src/lib/userAuth.ts` (token/user storage, separate from admin-panel's — different actor type/JWT), `frontend/src/components/Header.tsx` (site-wide header, top-right Login/Signup buttons, swaps to "Hi, {name}" + Logout when signed in), `frontend/src/app/login/page.tsx`, `frontend/src/app/signup/page.tsx`, `frontend/src/app/verify-email/[token]/page.tsx` (handles the verification link the backend already emails via `EMAIL_VERIFICATION_EXPIRY_HOURS` — this link previously had no corresponding frontend page). All wired to the **already-existing** backend endpoints (`/auth/user/signup`, `/auth/user/login`, `/auth/user/verify-email/:token`) — no backend auth changes needed, only frontend never called them.
- `frontend/src/app/layout.tsx` — now renders `<Header />` above `{children}` site-wide.
- **Review write form** (`frontend/src/modules/hotel/components/ReviewForm.tsx`) is now actually rendered on the hotel page (`app/hotel/page.tsx`) — previously the component existed but nothing imported/rendered it, so there was no way to submit a review at all, only view existing ones.
- Reviews support **both** logged-in customers and guests, per explicit decision: `ReviewForm` checks for a stored user token — if present, sends it as a Bearer token and shows "Posting as {name}" (skips asking for a name); if absent, shows the "Your Name" field for a guest submission. Backend (`optionalAuthenticate` on the reviews route, `guestName` fallback in `createHotelReview`) already supported both paths from the prior session.

### Notes
- No backend changes in this entry — confirmed via route/controller/schema review that guest+logged-in review support, admin review moderation (list/approve/reply/delete), and full user signup/login/verify-email/forgot-password were already built; this entry closes the remaining frontend gap (no way to sign up, log in, or submit a review at all).
- Verified: `tsc --noEmit` (backend) — 0 errors. `next build` (admin-panel) — 0 errors. `next build` (frontend, using a temporary tsconfig copy to route around the separately-flagged `ignoreDeprecations` bug) — 0 errors, all 9 routes compile including the 3 new ones.
- Email verification and password reset both depend on SMTP being configured in `backend/.env` (falls back to console-logging the email content in dev if unset, per the Auth module's existing behavior) — nothing new here, just a reminder since it now has a real frontend entry point.

---

## [2026-07-31] — Room Amenities field, Edit Room form, Gallery category grouping

### Added
- **Backend:** `GET /api/v1/admin/hotels/rooms/:roomId` (new) — wires the already-existing `hotelService.getRoomById()` (previously unused by any route) to an admin endpoint. Needed so the admin panel's new Edit Room form can pre-fill current values. Roles: `super_admin`, `branch_admin`, `staff` (view-only parity with the existing availability GET route).
- **Admin Panel — Room create form:** new "Amenities" input (comma-separated text, split into a `string[]` on submit) — backend already supported `amenities` on `Room` (`room.model.ts`, `createRoomSchema`), the admin form simply never exposed it.
- **Admin Panel — Room edit form** (new, on the existing "Manage Room" page at `/hotels/[hotelId]/rooms/[roomId]`): pre-filled via the new GET endpoint above, saves via the already-existing `PUT /api/v1/admin/hotels/rooms/:roomId`. Covers Category, Name, Slug (with a warning about changing a live room's public URL), Description, Base Price, Max Occupancy, Total Rooms, Amenities. Previously this page only supported availability-blocking; there was no way to edit a room's own fields after creation without calling the API directly.
- **Public site — Gallery grouping by category:** `frontend/src/components/GalleryGrid.tsx` now groups images by `category` (e.g. "exterior", "room", "food") with a subheading per group, instead of one flat unlabeled grid. `category` was already saved to the database via the admin Gallery form and returned by the API, but no frontend code ever read or displayed it. `frontend/src/lib/hotel.ts`'s `HotelDetailsData` type updated to include `category` on gallery items (was previously typed narrower than the actual API response).

### Changed
- `admin-panel/src/lib/api.ts` — `formatApiError()` moved here from the hotel-detail page (`[hotelId]/page.tsx`) and exported, so the new room-edit page can reuse it instead of duplicating it. No behavior change to existing callers.

### Notes
- No schema changes; no breaking changes to any existing endpoint.
- Verified: `tsc --noEmit` (backend) — 0 errors. `next build` (admin-panel) — 0 errors, all 7 routes compile. Frontend verified via a temporary tsconfig copy (see below) — 0 errors in edited files.
- **Separate, pre-existing issue found (not caused by this or any prior change in this session):** `frontend/tsconfig.json` has `"ignoreDeprecations": "6.0"`, which is not a valid value for the installed TypeScript version (5.9.3 — only `"5.0"` is currently valid) and makes `next build` fail immediately in the frontend workspace, unrelated to any source file. Flagged for a decision — not fixed here since it wasn't part of this request and touches a config file outside this session's scope.

---

## [2026-07-30 (c)] — Admin Panel: Surface field-level validation errors + auto-slug (Hotel → Rooms/Offers/FAQs/Gallery forms)

### Fixed
- `admin-panel/src/app/hotels/[hotelId]/page.tsx` — every form on this page (Room/Offer/FAQ/Gallery create+delete) called `alert(res.message)` on failure, which only ever showed the generic `"Validation failed"` string and discarded the actual per-field reason the API already returns in `res.errors` (e.g. `slug: Invalid`). This made it impossible to tell *which* field was wrong or why. Added a `formatApiError(res)` helper that renders `field: message` for each validation error when present, falling back to `res.message` for non-validation failures (409 conflicts, 403s, etc.). Applied consistently across all 8 alert call sites on this page.

### Added
- Room creation form: **Slug now auto-fills from Name** using a `slugify()` helper (lowercase, spaces → hyphens, strips anything outside `[a-z0-9-]`) — matches the backend's slug regex (`hotel.validation.ts`) exactly, so a correctly-typed Name can no longer produce an invalid slug. A `slugEditedManually` flag ensures that once the admin edits the Slug field by hand, further Name edits don't silently overwrite their choice. Helper text added under the Slug field explaining the allowed format.

### Notes
- Root cause of the reported error: the admin had typed `A s` into Slug (uppercase + space) — backend rejects this per `/^[a-z0-9-]+$/`. Auto-slug generation prevents this class of error going forward; the improved error message would also have made the original cause immediately obvious.
- No backend route, schema, or API contract changed — this is an admin-panel-only UX fix.
- Verified: `next build` succeeds with zero type errors across the admin-panel app after this change.

---

## [2026-07-30 (b)] — Fix: Cloudinary env vars not picked up at boot (import-order bug)

### Fixed
- `backend/src/config/cloudinary.ts` was reading `process.env.CLOUDINARY_*` **at module-import time**, but `server.ts` calls `dotenv.config()` *after* its own imports resolve (imports always run before later statements in the same file) — so Cloudinary was configured with empty values on every boot regardless of what was actually in `.env`, and the "not configured" warning printed even when the env vars were set correctly.
- Fix: `cloudinary.config()` and the "is it configured" check now happen **lazily**, inside `configureCloudinary()` / `isCloudinaryConfigured()`, called only when an upload/delete actually runs (well after `dotenv.config()` has executed) — mirrors the existing lazy pattern already used in `config/db.ts`'s `connectDB()`.
- No API contract, schema, or route changed — this is an internal correctness fix confined to files added in the `[2026-07-30]` entry above.

---

## [2026-07-30] — Cloudinary Image Upload Integration (Hotel Module Completion phase)

### Added
- `backend/src/config/cloudinary.ts` — Cloudinary SDK configuration (shared, not Hotel-specific; reusable by future Hall/Restaurant modules).
- `backend/src/utils/cloudinary.util.ts` — shared `uploadImageBuffer(buffer, folder)` / `deleteImageByPublicId(publicId)` helpers.
- `backend/src/middlewares/upload.middleware.ts` — multer memory-storage middleware (image mimetype + size validation); files are never written to local disk.
- `POST /api/v1/admin/hotels/upload-image?folder=` — admin-only (`super_admin`/`branch_admin`), uploads an image to Cloudinary, returns `{ url, publicId, width, height, format, bytes }`.
- `DELETE /api/v1/admin/hotels/upload-image` — admin-only, deletes an image from Cloudinary by `publicId`.
- `AI_INSTRUCTIONS.md` §21 "How to Handle Media/Image Uploads" — Cloudinary is now the documented standard media provider (was previously missing from both `RULES.md` and `AI_INSTRUCTIONS.md`, flagged and corrected in this session).
- New env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MAX_IMAGE_UPLOAD_MB` (optional, default 5).
- New dependency: `cloudinary@^2.5.1` (backend). `multer` was already present in `package.json` since initial scaffold but had zero usages until now.

### Changed
- `backend/src/middlewares/error.middleware.ts` — additive change only: now normalizes Multer upload errors (previously fell through as generic `500`) to a proper `400` with the specific message (e.g. disallowed file type, oversized file). No existing error-handling behavior for other error types was altered.

### Notes
- **No existing Hotel/Room/Gallery/Offer schema or endpoint was changed.** These continue to accept `imageUrl`/`images` as plain string(s), exactly as before. The new upload endpoint is a separate, additive step: admin panel uploads the file first, gets back a Cloudinary `url`, then passes that string into the existing create/update calls unchanged.
- This closes a real documentation gap: the original Hotel Module Completion brief referenced "Image Upload using existing Cloudinary integration," but no Cloudinary integration existed in the codebase prior to this entry (confirmed via full codebase search — only unused `multer` was present). `RULES.md` was **not** modified (frozen, requires the explicit "update RULES.md" phrase per its own governance clause) — flagged to the owner for a decision.
- Verified: `npm install` (backend) succeeds with the new dependency; `tsc --noEmit` passes with zero errors across the full backend after these changes.

---

## [2026-07-25 (c)] — Hotel Frontend Simplification (single-property, Option A)

### Changed
- Removed hotel **listing** page (`frontend/src/app/hotels/page.tsx`) and the `hotelSlug`-based dynamic routes — per current business scale (1 physical property, `RULES.md`), a listing/selection UI added no value.
- New route structure: `/hotel` (single hotel page, no slug param) → `/hotel/rooms/[roomSlug]` → `/hotel/rooms/[roomSlug]/book` → `/booking-confirmation/[reference]` (unchanged).
- `frontend/src/modules/hotel/components/RoomCard.tsx` — dropped the now-unnecessary `hotelSlug` prop; links directly to `/hotel/rooms/:slug`.
- `frontend/src/app/page.tsx` — updated stub home page to link to `/hotel`.

### Added
- `frontend/src/lib/hotel.ts` — `getTheHotel()` / `getTheHotelRoom(slug)` helpers. These call the **unchanged** backend (`GET /hotels`, `GET /hotels/:slug`) and simply auto-select the first/only active hotel. This is the single place that would need to change if a second property is added later — no backend or API contract changes required.

### Removed
- `frontend/src/app/hotels/` (entire folder — listing page + old slug-based room/booking routes, superseded by `/hotel/...` above).
- `frontend/src/modules/hotel/components/HotelCard.tsx` — no longer used (was only for the listing page).

### Notes
- **Backend is completely unchanged** — `hotel.service.ts`, `hotel.controller.ts`, `hotel.routes.ts`, and all models remain multi-hotel-ready (admin can still create multiple hotels via the existing admin API). This was a frontend-only simplification per explicit request, not an architecture rollback.
- `next build` re-verified: 5 routes compile successfully (`/`, `/hotel`, `/hotel/rooms/[roomSlug]`, `/hotel/rooms/[roomSlug]/book`, `/booking-confirmation/[reference]`).

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
