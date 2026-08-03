# CHANGELOG.md — 7 Vachan

Format: newest entries on top. Categories: Added / Changed / Fixed / Security / Deprecated.

---

## [2026-08-03 (g)] — Platform Settings CMS, Audit Logs, Activity Timeline, Notifications, Exports, Global Search

Six admin-console modules, all additive. No booking, reservation or enquiry flow
changed; no existing endpoint changed shape.

### Added — Platform Settings (`backend/src/modules/settings/`)
Fifteen categories — general, business, branding, contact, social, homepage,
theme, booking, payment, email, seo, legal, features, integrations, maintenance
— behind `GET /api/v1/settings` (public, curated) and `/api/v1/admin/settings`
(Super Admin only, guarded on the router itself).

- **One document per category**, values schemaless. Reads merge the stored
  document over `SETTING_DEFAULTS`, so a new field appears in the admin panel
  without a migration and a missing category still returns working copy.
- **Unknown keys are dropped** against the defaults rather than rejected, so an
  admin-panel build ahead of the backend saves what the backend knows.
- **Secrets are write-only.** AES-256-GCM at rest, returned only as a
  `••••••••1234` mask. Blank means "keep", `__clear__` means "delete" — that is
  what lets someone change the SMTP port without retyping the password.
- **Public exposure is decided per category**, not per key
  (`PUBLIC_SETTING_CATEGORIES`), so one reviewable decision governs a whole
  group. `payment`, `email` and `integrations` are absent from it.

**The homepage CMS answers the owner's question directly.** Every fixed string
on the home page — including the "Considered comforts" facilities band — is now
editable. The band previously rendered the *hotel's* amenity list, which spoke
for one third of the estate; a curated list in Settings now takes over when one
exists, so it can mix facilities from all three businesses. Leaving it empty
keeps the old behaviour exactly.

Each default in `settings.defaults.ts` is a **word-for-word transcription** of
what the page rendered before. An install that never opens Settings looks
identical — a default is a transcription, not an improvement.

### Added — Integrations reach Razorpay, Cloudinary and SMTP without touching them
`razorpay.util.ts`, `config/cloudinary.ts` and `email.util.ts` already read
`process.env` **lazily at call time** rather than at import (each documents why:
`dotenv.config()` runs after imports resolve). `applyIntegrationEnv()` writes
saved credentials into `process.env` on boot and after every save, so those
three files are unchanged. Blank values are skipped and a decryption failure is
skipped, leaving `.env` as the fallback — a half-filled Settings page cannot
take payments offline.

The one edit needed was `resetEmailTransport()` in `email.util.ts`: nodemailer
caches its transporter, so an SMTP change would otherwise wait for a restart.

### Added — Audit Logs (`backend/src/modules/audit/`, `/audit-logs`)
Records create, update, delete, login, logout, failed login, role change, status
change, password reset, upload, export and settings change — with actor, role,
module, entity, IP, user agent, status code and a redacted body snapshot.

**Not one controller or service was modified.** `middlewares/audit.middleware.ts`
is mounted on each admin router and hooks `res.on("finish")`, so it sees every
mutation those routers will ever have, runs after the response is sent, and
cannot slow or fail a request. Login and failed login are recorded explicitly in
the auth controller, because login is not on an admin router (there is no token
yet) and a *failed* attempt is worth recording precisely because nothing changed.

Read-only, Super Admin only, no write endpoint — an audit log with a write route
is a suggestion box. Anything matching `pass|secret|token|key|otp|signature|cvv`
is replaced with `[redacted]` before storage; secrets are dropped rather than
truncated, because a truncated secret is still a leaked prefix.

Added `POST /auth/admin/logout`, which closes the audit trail and nothing else —
there is no token blocklist here and pretending otherwise would be worse than
not offering it.

### Added — Activity Timeline and Notification Centre (one service, two features)
`console/activity.service.ts` derives a unified feed from the source
collections. The obvious design — an `Activity` table written to on every event
— would have meant edits inside `createHotelBooking`, `verifyPayment`,
`createReservation`, `createEnquiry` and the review path: five changes to
money-handling code for a dashboard widget. Deriving costs five indexed, capped,
projected queries, cannot drift from reality, cannot double-count a retry, and
needed no backfill.

Notifications are the notification-worthy subset of that same feed plus
per-admin read state. Only the *read* half is stored, and "mark all read" writes
one watermark document rather than one row per item. Read markers expire after
90 days via a TTL index.

Both are scoped by `effectiveScope` — the same function the route guards use —
so a hall manager's dashboard and bell contain hall activity and nothing else.

### Added — Export & Reports (`/reports`)
Bookings, customers, reviews, reservations, hall enquiries and a revenue report,
as CSV, Excel and PDF, with a date filter. Datasets are *described* (columns,
allowed formats, owning vertical) and one set of writers renders any of them, so
a seventh export is one object rather than three new writers.

- Read-only throughout; the booking flow is untouched.
- Datasets outside the caller's scope render **locked rather than hidden** — a
  manager wondering where the revenue report went is a worse experience than one
  being told. `assertAllowed()` throws 403 regardless of what the page draws.
- **CSV formula injection is neutralised**: a value starting with `=`, `+`, `-`
  or `@` is tab-prefixed, so a review saying `=HYPERLINK(...)` cannot become a
  live link in the owner's spreadsheet. A UTF-8 BOM is emitted so `₹` and
  accented names survive Excel on Windows.
- Revenue counts money **actually received** (`paymentStatus: "paid"`, summing
  `advancePaid`), not `advanceRequired` — counting what was asked for would
  report income from bookings nobody paid for.
- Every download is audited with who took it and for which window, because
  exports leave the building with guest names, emails and phone numbers.

Added dependencies: `exceljs`, `pdfkit`, `@types/pdfkit`.

### Added — Global Search
`GET /admin/console/search` across customers, bookings, rooms, reservations,
hall enquiries, reviews, offers, FAQs and admin accounts, grouped by module and
filtered by the caller's scope. Customers and admin accounts are Super Admin
only — a guest list is the most sensitive thing in the database.

Regex rather than a `$text` index, deliberately: every useful query here is a
*fragment* of an identifier, and `$text` tokenises on words, so it would not
match "7V-4A2" against "7V-4A2B91C" at all — the single most common thing anyone
will type. The upgrade path past a few hundred thousand rows is Atlas Search.

The ⌘K palette now merges instant local nav/property matches with server results
underneath. Previously it filtered only what `SummaryProvider` happened to hold,
so a booking outside the loaded window was unfindable and rooms, enquiries,
reviews, offers and FAQs were not searchable at all.

### Changed — public site reads Settings
Home page copy and section toggles, footer contact details and social links,
root and home-page SEO metadata, favicon and OG image. New `/legal/[slug]` pages
for privacy, terms, cancellation and refund.

Legal pages **404 when unpublished**, and the footer only links to ones that
exist. This is the one place `notFound()` is right where `PropertyUnavailable`
is used elsewhere: an empty policy is a deliberate state, not an unreachable
API, and a refund policy rendering as a friendly placeholder is a legal claim
nobody made.

Markdown is rendered by a deliberately small in-file subset (headings,
paragraphs, bullets, bold). Pulling in a parser and a sanitiser for four
admin-authored documents that never contain a table is not worth the bundle —
and "trusted author" is not a reason to inject raw HTML.

### Fixed — settings never reached the site (caught in verification)
`getSettings()` first passed `cache: "force-cache"` **and** `next.revalidate`.
Next refuses that combination — it warns "only one should be specified", and
force-cache wins, pinning the very first response forever. Admin edits saved
correctly and never appeared. Now `no-store`, with React's `cache()` collapsing
every call in one render into a single request and the backend caching its own
read for a minute.

### Security
- Settings and Audit Logs are Super Admin only, guarded at the **router** level
  so a new route cannot ship unguarded.
- Branding uploads use the Settings module's own Cloudinary route rather than
  the hotel's, which is guarded by `HOTEL_MANAGER_ROLES` — reusing it would have
  given a hotel manager a path to replace the site logo.
- `/admin/console/*` deliberately has **no** `requireRole`: those four features
  are scoped, not restricted. A hall manager should have a dashboard, a bell and
  a search box — they should just contain hall data. Scoping is enforced per
  request in the services; a role check at the router would either lock managers
  out or show them the whole estate.
- `SETTINGS_SECRET_KEY` (new, optional) keys the settings encryption. Without
  it, the key is derived from `ADMIN_JWT_SECRET` — which means rotating that
  secret makes stored secrets undecryptable. Decryption failures fall back to
  `.env` rather than throwing, so a rotation degrades the platform to its
  environment configuration instead of breaking it.

### Verified live
Scratch backend on 5055 and a scratch frontend on 3099, never the user's own
servers:

- Public settings expose 12 categories; `payment`, `email` and `integrations`
  are absent, and a saved SMTP password appears nowhere in the payload.
- A secret saved as `super-secret-value-9931` echoes back as `""` with hint
  `••••••••9931`; re-saving other fields keeps it.
- Unknown keys dropped, untouched defaults preserved.
- `hotel_manager`: 403 on `/admin/settings` and `/admin/audit-logs`, 200 on all
  four `/admin/console/*` routes with `scope: ["hotel"]`, 403 when exporting
  customers.
- Audit rows written automatically for every settings change and account
  creation, with IP; no row contains a password or an API key; failed login
  recorded.
- Notifications: 34 items, mark-one-read → 33, mark-all-read → 0.
- Exports: all eight dataset/format combinations returned correct magic bytes
  (`%PDF`, `PK\x03\x04`, UTF-8 BOM) and `customers/pdf` was refused with a
  clear message.
- Editing Settings → Homepage changed the **rendered HTML** of the public home
  page; section toggles removed the testimonials and map bands; resetting the
  category restored the original copy exactly.
- Publishing a privacy policy flipped `/legal/privacy` from 404 to 200 with
  markdown rendered and bold applied; the footer link appeared only for the
  published page. Contact details, social links (only configured ones), SEO
  title/description and the `noindex` switch all reached the served HTML.

### Testing notes
Two traps that manufacture false passes, both hit during this work:

- `Select` in the admin UI renders `children`, not an `options` prop, and
  `Button`'s variant is `secondary`, not `outline`. Both are typecheck failures,
  not runtime ones — run `npx tsc --noEmit` per workspace.
- `TextReveal` splits a heading into per-word spans and exposes the whole string
  as `aria-label`. Grepping rendered HTML for a heading works, but grepping for
  JSX text interpolated next to a variable (`Last reviewed {value}`) does not —
  React emits a comment node between them.

---

## [2026-08-03 (f)] — Removed the `branch_admin` and `staff` roles

### Changed — four admin roles instead of six
At the owner's decision: 7 Vachan will only ever run one branch, so a
branch-scoped admin was a second Super Admin under another name; and the
read-only `staff` tier had nobody to fill it, because a manager already reads
everything inside their own vertical.

`AdminRole` is now `super_admin | hotel_manager | restaurant_manager | hall_manager`.

- `HOTEL_MANAGER_ROLES` → `["super_admin", "hotel_manager"]`
- `RESTAURANT_MANAGER_ROLES` → `["super_admin", "restaurant_manager"]`
- `HALL_MANAGER_ROLES` → `["super_admin", "hall_manager"]`
- 17 `requireRole(...X, "staff")` read-guards collapsed to `requireRole(...X)`
  (4 hotel, 5 restaurant, 8 hall). No route changed who *can* write, only who
  could read without writing — and nobody holds that role.
- `ROLE_IMPLIED_SCOPE` lost its two `"all"`/`[]` entries, so **every** role's
  business scope is now derived from the role. `businessScope` in a request body
  is accepted and ignored rather than rejected, so an older admin-panel build
  that still sends it gets a clean response instead of a validation error.
- Admin panel `/users`: four roles, the assignable-scope checkbox block removed
  (nothing left to assign), and the Branch ID field prefilled from
  `businessContext`.
- Both seeders updated; `seed-demo-content.ts` now says which verticals your
  login can actually write instead of special-casing two removed roles.

**This removed the roles, not the multi-tenant data model.** `branchId` stays
required on every non-Super-Admin account and on every property because
`RULES.md` §26 freezes that requirement. Adding a second branch later means
reintroducing a role, not migrating data.

Checked the live database first: only one account existed (`super_admin`), so no
migration was needed.

### Fixed — a single legacy-role row 500'd the whole admin list
`ROLE_IMPLIED_SCOPE[role]` is `undefined` for a role no longer in the enum, and
`effectiveScope()` read `.length` off it. Any account still on `branch_admin` or
`staff` therefore made `GET /admin/users` return 500 — one stale document costing
you the exact screen you would use to fix it. Found it for real: a test run
against a stale process created a `branch_admin` row, and the list endpoint died.

`effectiveScope()` and `resolveScope()` now guard for `undefined`, a new
`isLegacyRole()` is exported, and the API returns `isLegacyRole: true` on both the
list and single-account responses. The admin panel renders a red "retired" badge
on those rows plus a banner explaining they are refused everywhere and should be
reassigned or deleted. A legacy account resolves to an empty scope, which is also
the safe answer — every `requireRole` list names current roles explicitly.

### Security — verified live, not assumed
Against a scratch backend on 5055:

| Role | hotel/bookings | restaurant/reservations | hall/enquiries | admin/users |
|---|---|---|---|---|
| `hotel_manager` | 200 | 403 | 403 | 403 |
| `restaurant_manager` | 403 | 200 | 403 | 403 |
| `hall_manager` | 403 | 403 | 200 | 403 |
| `super_admin` | 200 | 200 | 200 | 200 |

Also confirmed: `branch_admin` and `staff` refused with a 400 enum error on both
create and update; a manager calling `POST /admin/users` or raising their own role
via `PUT` gets 403; a role change flipped the *same unexpired token* from
200-on-hotel to 200-on-hall with no re-login; deactivating flipped it to 403
immediately; password reset invalidated the old password; and the self-edit,
duplicate-email, missing-branch and password-length rules all refused with their
own status codes.

Two testing traps that manufacture false passes, recorded because they cost real
time here: the admin routers have **no bare `GET /`**, so probing `/admin/hotels`
hits the global 404 *before* `requireRole` runs and the whole matrix reads 404
while proving nothing; and `adminUser.routes.ts` uses `PUT` (not `PATCH`) with
`/:adminId/password` (not `/reset-password`), so a wrong verb 404s — and a 404
body has `success: false`, which reads as "correctly blocked" to any assertion
that only tests that flag. Assert on status codes.

A third: `pkill -f "PORT=5055"` did not actually kill the scratch backend on
Windows, so an early run tested stale code and reported `branch_admin` as still
creatable. Kill by port via `Get-NetTCPConnection` instead.

---

## [2026-08-03 (e)] — User & Role Management, estate home page, hall availability ranges

### Added — User & Role Management (Super Admin only)
New `backend/src/modules/auth/adminUser.{validation,service,controller,routes}.ts`, mounted at `/api/v1/admin/users`, plus a rebuilt `/users` page in the admin panel: list, create, edit, change role, assign business scope and branch, activate/deactivate, reset password, delete, last-login and account status.

Placed inside the existing `auth` module rather than a new top-level one — the `Admin` model already lives there.

- **Two new roles**: `hotel_manager` and `restaurant_manager`, alongside the existing `hall_manager`. Isolation is structural, not special-cased: each module already named its allowed roles explicitly, so adding one name to each list is the entire change. **One line per file in `hotel.routes.ts` and `restaurant.routes.ts`; no handler, route or business rule touched.**
- **`businessScope`** added to the Admin model, assignable only for `staff` (read-only, per assigned module). For managers it is derived from the role and kept in sync on write, so the stored value can never contradict what the guards allow.
- **`createdBy`** recorded on every account.
- Guard is applied to the whole router (`requireRole("super_admin")`), so a route added to this file can never accidentally ship unprotected.

**Business rules enforced server-side**, not in the UI: nobody can change their own role or deactivate/delete themselves, and **the last active Super Admin is protected** from demotion, deactivation and deletion — without that, an installation can reach a state where no account can create another, unrecoverable without database access. Branch is mandatory for every role except Super Admin; a staff account must have at least one business in scope.

### Changed — permission changes now take effect immediately
`authenticate("admin")` re-reads the account from the database on every admin request and uses the **live** role, rejecting deactivated accounts.

The brief required immediate effect, and a JWT cannot deliver it: an admin demoted from `super_admin` to `staff` would otherwise keep full access until their token expired — up to seven days — and a deactivated account would keep working entirely. Cost is one indexed `findById` per admin request; admin traffic is a handful of staff, so that is a fair trade. **User tokens are deliberately not re-checked** — public-facing, far higher volume, no privileged role to revoke.

### Added — Marriage Hall availability ranges
`PUT /admin/halls/:hallId/availability/range` plus a "Block a range" dialog in the admin calendar. A three-day wedding or a maintenance week was previously twenty passes through the single-date dialog. Capped at 366 days, written as one `bulkWrite`, and `available` clears overrides across the range exactly as the single-date route does.

### Added — customer-facing enquiry status page
`/marriage-hall/enquiry/[reference]`. The backend already emailed on approve/confirm/decline, but email is not a status board — it gets buried, filtered, or lands in an inbox someone else checks, and there was no way to answer "is our date booked?" without phoning. Shows the current stage on a four-step track, what was asked for, and a withdraw action while that is still possible. Both enquiry emails and the submit confirmation now carry the link.

### Changed — the home page is now the estate's front door
It sold only the Hotel: a hotel hero, hotel-only promises, and a gallery of nine bedrooms. Someone arriving from a wedding-venue search saw nothing that spoke to them.

- **Hero** draws one strong frame from each vertical, and no longer duplicates `/hotel`'s hero.
- **`ESTATE_VALUE_POINTS`** replaces the hotel-only promises with four that are true of all three. `HOTEL_VALUE_POINTS` moved to `/hotel`, where it belongs.
- **New `EstateGallery`** interleaves all three collections with a module filter and per-module "Explore all". Which photographs appear is controlled from each vertical's existing Gallery tab — there is no separate homepage gallery to maintain.
- **Offers and testimonials span all three.** `OffersPreview` gained an optional per-offer `href` and `badge`, because a hotel offer must reach the booking flow and a hall offer the enquiry form. The headline rating is a weighted mean over the three counts, not an average of averages, which would let a vertical with two reviews outweigh one with fifty.

### Fixed
- **Two nav dropdowns could be open at once.** The menu was pure CSS (`group-hover` + `group-focus-within`): clicking a group's parent left focus on it, so focus-within held that panel open while hovering the next opened a second. Now a single `openMenu` state, which can only ever name one. Keyboard access and Escape-to-close preserved; closed items are `tabIndex={-1}` so Tab doesn't walk through invisible links.
- **Hall package cards read as cramped.** Four cards in a four-column grid, each with a photo, title, tagline, description, guest range, tick list and a boxed "Investment / On request" block. Now two columns, tier name on the photograph, guest range as a pill, and the price label as quiet supporting text beside the CTA rather than a headline announcing a non-answer.

### Verification
- All three workspaces `tsc --noEmit` → 0 errors; both Next apps build.
- **RBAC tested live against a scratch backend on port 5055** (leaving the running dev server untouched): a `hall_manager` token returned **200** on `/admin/halls/enquiries/list` and **403** on `/admin/hotels/bookings`, `/admin/restaurants/reservations` and `/admin/users`. All four business rules returned their intended messages. After deactivating that account, the *same unexpired token* returned **403** — instant revocation confirmed. Test account deleted afterwards.
- Home page verified rendering all three verticals with the module filter.

---

## [2026-08-03 (d)] — Cinematic Hotel landing page + graceful degradation when the API is down

### Fixed — an unreachable backend no longer breaks the public site
Reported as "frontend error on startup". The cause was ordinary — `npm run dev:all` launches all three apps at once, the frontend was ready in 3.3s and started server-rendering before the backend had finished connecting, so its fetches hit `ECONNREFUSED`. But the *response* to that was wrong in two ways:

- **`frontend/src/lib/api.ts` had no try/catch around `fetch`.** Every caller checks `if (!res.success)`, so nobody caught the rejection — a backend that was down, restarting, or merely slower to boot produced `unhandledRejection` and `⨯ Error: failed to pipe response` instead of the form's own error message. It now returns the standard `{ success: false, message }` envelope, and separately guards `res.json()` against a non-JSON error page.
- **21 pages called `notFound()` when their loader returned null.** That loader returns null for two unrelated reasons — the property does not exist, or the API is unreachable — so a thirty-second backend restart served "page not found" for a live hotel, to guests and to search engines alike.

Added **`components/PropertyUnavailable.tsx`**: an honest "we can't load this right now" panel with a retry link and the venue's phone number, so a guest who came to book still can. Applied to all 19 property-level pages across Hotel and Restaurant.

The three `[reference]` confirmation pages keep `notFound()` — there, null genuinely means no booking with that reference, and 404 is correct. `/hotel/booking`, `/restaurant/reserve` and `/hotel/rooms/[roomSlug]` had compound guards that conflated the two cases; those are now split, so an unreachable API degrades while a genuinely missing room or an unconfigured venue still 404s.

**Verified by running a second frontend instance against a dead API port** (leaving the real dev servers untouched): every page returned 200 with its empty state, and the log recorded zero `unhandledRejection` and zero `failed to pipe response`. Before the fix those were exactly what appeared.

### Changed — `/hotel` rebuilt to the Marriage Hall's standard
It had a static scrim-over-a-still masthead while `/marriage-hall` had a full-screen cinematic opener. Now matched:

- Full-screen **Ken Burns hero** with crossfading slides, word-mask headline reveal, slide indicators and scroll cue — the shared `<Hero>`, the same one the hall and home page use.
- **Counted stat tiles** (room types, amenities, star rating, guest reviews) via `AnimatedNumber`.
- **Parallax editorial band** pairing a portrait image with check-in/check-out, lowest rate and reception hours.
- **Full-bleed parallax quote band** between the rooms and amenities.
- **Guest pull-quote** from the highest-profile approved review.
- **Closing invitation** over a dimmed parallax image, mirroring the hall's.

No new motion vocabulary — everything reuses `Hero`, `Reveal`, `Parallax`, `TextReveal`, `Stagger` and `AnimatedNumber`, so `prefers-reduced-motion` handling comes for free. Still a Server Component; the motion wrappers remain the only client islands.

### Verification
- Frontend `tsc --noEmit` → 0 errors; `next build` → compiled successfully.
- Live: `/hotel` renders the Ken Burns hero, all new sections and 57 Pexels images. Every hotel, restaurant and hall route returns 200.

---

## [2026-08-03 (c)] — Demo content: Pexels photography for all three verticals

Makes the site presentable for review before the owner's own photographs exist. Content and imagery only — no route, model, service, validation schema, RBAC rule or business logic changed anywhere.

### Added
- **`database/seeders/seed-demo-content.ts`** — one idempotent seeder covering Hotel, Restaurant and Marriage Hall:

  | Vertical | What it fills |
  |---|---|
  | Hotel | Room photographs by category, 17 gallery images across 5 categories, 5 FAQs, 2 offers |
  | Restaurant | Hero images, dish photographs matched by name, dining-area photographs, 18 gallery images across 5 categories, 4 FAQs, 2 offers |
  | Marriage Hall | The venue, 4 packages, 8 decoration themes with colour palettes and before/after frames, 5 catering sections, 6 dining arrangements, 6 floral setups, 28 gallery images across 9 categories, 7 FAQs, 2 offers |

  ```bash
  cd backend && npx ts-node ../database/seeders/seed-demo-content.ts
  ```

- **`frontend/src/components/sections/VerticalsPreview.tsx`** and an estate band on the home page. The home page previously sold only the Hotel — the Restaurant and Marriage Hall were reachable solely through the top navigation, so a visitor arriving from a wedding-venue search had no reason to believe this site had one. Three cards, placed after Featured Rooms. Additive: no existing section was modified, and a vertical that isn't seeded simply drops out of the row.

### Changed
- **Home page** now fetches all three verticals in a single `Promise.all`. Each call is already `cache()`-memoised, so this costs one round-trip set rather than three sequential ones.
- **`CLAUDE.md`** — the seeding section now lists both seeders and notes they must run from `backend/`.

### Removed
- **`database/seeders/seed-marriage-hall.ts`** — superseded by `seed-demo-content.ts`, which covers all three verticals. Keeping both would have let their imagery drift apart, since the old one used a different image source.

### On the images
Pexels, free for commercial use with no attribution required (https://www.pexels.com/license/). Served straight from `images.pexels.com` with a width transform — nothing is uploaded to Cloudinary, so replacing them later is just uploading real photographs through the admin panel, which overwrites these URLs. No seeder edit will be needed.

Non-Cloudinary URLs pass through `cldImage()` untouched and `LuxeImage` renders a plain `<img>`, so no `next.config.js` remote-host whitelisting is involved.

**All 124 photo IDs were verified to return HTTP 200 before being written into the file.** One candidate (`15323383`) 404'd and was replaced with a checked alternative. Photo IDs and their subjects were pulled from Pexels' own search pages rather than guessed.

### Safety — what the seeder will not do
Never touches, under any circumstance: `HotelBooking` · `TableReservation` · `HallEnquiry` · `User` · `Admin` · room pricing or capacity · menu prices · any Hotel/Restaurant business field. Live operational data is out of scope for a content seeder.

Hotel and Restaurant FAQs and offers are added **only when none exist**, so hand-written entries survive a re-run. Galleries are replaced wholesale — those held placeholder URLs. Hall content is fully rewritten, since this script creates the hall.

Hall packages still ship with `priceLabel: "On request"`. The seeder must never invent a price.

### Fixed — the seeder actually runs now
Three defects found while diagnosing "nothing went into the database":

1. **ts-node was silently executing nothing.** The file had no `import` or `export`, so ts-node treated it as a plain script: exit 0, no output, no error, empty database. Adding a `path`/`dotenv` import fixed it, and a comment now warns against removing them. This was the actual reason the first run appeared to do nothing.
2. **It would have created a duplicate hall.** The hall section upserted on slug `7-vachan-banquets`, which would have sat next to the hall already created in the admin panel — and since `getTheHall()` takes the first row of a newest-first list, the seeded one would have hidden the real one on the public site. It now enriches the existing hall and adds only missing packages/showcases, matched on slug and on `showcaseType`+title, so hand-made entries survive.
3. **It could not connect at all.** `mongodb+srv://` needs a DNS SRV lookup, which this network refuses (`querySrv ECONNREFUSED`) even though the already-running backend keeps working. **Rewritten to write through `/api/v1/admin/*`** using the backend's live connection — no DNS lookup, no connection string, and every write now passes real Zod validation and RBAC. It needs the backend running plus admin credentials:

```bash
cd backend && npx ts-node ../database/seeders/seed-demo-content.ts \
  --email you@example.com --password yourpassword
```

Also: `process.exit()` on the error path tripped a libuv assertion on Windows while an undici socket was still closing, printing a fake crash on top of the real error. Now sets `process.exitCode` and lets Node drain.

### Verification
- Seeder type-checks clean; all three workspaces still `tsc --noEmit` with **0 errors** and build.
- Executed end-to-end against the running backend: reaches the API, authenticates, and fails with a precise message on bad credentials (`POST /auth/admin/login → Invalid email or password.`). Clean exit, no assertion.
- **Not executed with real credentials** — none were available in this session, so the write paths are verified by build, types and endpoint shapes rather than by a completed run.

---

## [2026-08-03 (b)] — Phase 4: Marriage Hall module

The third vertical, built frontend-first per the brief (80% experience, 20% backend). **Hotel and Restaurant are untouched** — `git diff` over `backend/src/modules/hotel/`, `backend/src/modules/restaurant/`, `frontend/src/app/hotel/`, `frontend/src/app/restaurant/` and `frontend/src/modules/{hotel,restaurant}/` is empty.

### Added — Backend (`backend/src/modules/hall/`)
- **Models** — `hall`, `hallPackage`, `hallShowcase`, `hallAvailability`, `hallEnquiry`. Same conventions as the other two verticals: `branchId` multi-tenancy, slug scoping, `isActive` soft delete, midnight-UTC dates.
- **`hall.validation.ts`** — Zod schemas for every route, including a hex-colour validator for decoration palettes and a 1-12 month calendar query.
- **`hall.service.ts`** — venue / package / showcase CRUD, the computed availability calendar, `isDateOpenForEnquiry`.
- **`enquiry.service.ts`** — enquiry creation, reference generation (`7VH-`), guest lookup, admin list, status transitions with their calendar side effects, guest-initiated withdrawal.
- **`hall.controller.ts`** / **`hall.routes.ts`** — three routers matching the Hotel and Restaurant split: public content, public enquiries, admin.
- **`email.util.ts`** — two additive builders (`buildHallEnquiryReceivedEmailHtml`, `buildHallEnquiryStatusEmailHtml`). No existing builder changed. Neither ever says "booked" on submission.
- **`database/seeders/seed-marriage-hall.ts`** — idempotent seed: one venue, 4 packages, 8 decoration themes, 5 catering sections, 6 dining arrangements, 6 floral setups, 22 gallery images across 10 categories, 6 FAQs. *(Superseded same day by `seed-demo-content.ts` — see the entry above.)*

### Added — Public site (`frontend/src/app/marriage-hall/`)
Eight routes: `/marriage-hall` plus `gallery`, `packages`, `decorations`, `catering`, `availability`, `reviews`, `contact`. Every one is a Server Component with its own `generateMetadata`; interactive pieces are separate client islands.

- **Landing page** — cinematic: full-screen Ken Burns hero, counted stat tiles, parallax space-by-space editorial, gallery mosaic, decoration preview, packages, catering, testimonial, FAQs, closing CTA.
- **Gallery** — the priority surface. CSS-column masonry, category filters with counts, lightbox with keyboard paging, lazy loading, hover zoom and caption reveal, progressive "show more".
- **Decorations** — filterable theme grid with real colour-swatch palettes, an expanding detail panel, and a **draggable before/after comparison** of the bare hall against the dressed room. Floral styling shares the page.
- **Catering** — alternating editorial spreads for cuisine groups and dining arrangements, sample dishes as chips. No prices anywhere.
- **Availability** — a four-step process strip, then the live calendar and a four-step enquiry form.
- New components in `frontend/src/modules/hall/components/`: `MasonryGallery`, `AvailabilityCalendar`, `EnquiryForm`, `DecorationThemes`, `BeforeAfter`, `ShowcaseSection`, `PackageCards`, `FloatingEnquiry`, `HallEmpty`.
- `lib/hall.ts` mirrors `lib/hotel.ts`: one `cache()`-memoised aggregate on a 120s revalidate, with the calendar deliberately `no-store`.
- **Nothing was forked.** `Hero`, `Reveal`, `Parallax`, `TextReveal`, `Stagger`, `LuxeImage`, `Lightbox`, `PageHeader`, `Breadcrumbs`, `FaqAccordion`, `ReviewsList`, `ReviewForm`, `ContactForm`, `MapPlaceholder`, `AnimatedNumber`, `EmptyState` and the whole `ink`/`gold`/`cream` design system are reused as-is. New file count in `frontend/src/components/`: one (`HallSchema.tsx`, JSON-LD `EventVenue`).

### Added — Admin Console
- `/halls` venue list, `/halls/[hallId]` workspace with eleven tabs (Overview · Packages · Decoration · Catering · Dining · Floral · Gallery · Calendar · Offers · FAQs · Reviews), and `/enquiries` — the enquiry book with status filters, a detail drawer, internal notes and status transitions.
- New components: `hall/PackagesPanel`, `hall/ShowcasePanel` (one panel serving all four showcase types via a config table), `hall/CalendarPanel`.
- `GalleryManager`, `OffersManager`, `FaqManager` and `ReviewsManager` now serve a third vertical with **no changes** beyond passing `/admin/halls` as the base path — the payoff for having written them polymorphically.
- Marriage Hall unlocked in the business selector, sidebar and command palette. The Operations nav entry is now three-way: Bookings (Hotel) · Reservations (Restaurant) · Enquiries (Hall).
- Dashboard, Analytics, Customers, Reviews and Settings all extended to cover the third vertical. Analytics gains a hall enquiry funnel chart and an enquiry-to-confirmed conversion figure.

### Changed — shared files (all additive)
- **`admin.model.ts`** — `hall_manager` added to the `AdminRole` union and the schema enum. Additive only: no existing role's permissions changed.
- **`server.ts`** — three additive mounts on non-overlapping namespaces (`/halls`, `/hall-enquiries`, `/admin/halls`).
- **`email.util.ts`** — two additive exports.
- **`navLinks.ts`**, **`sitemap.ts`** — a Marriage Hall group and eight routes.
- **`admin-panel/src/lib/api.ts`** — `uploadHallImage()` added beside the existing two.
- No content model changed: `reviewableType`, `ownerType` and `applicableTo` already accepted `"hall"`.

### Security
- **RBAC as briefed, with no new middleware.** `HALL_MANAGER_ROLES = ["super_admin","branch_admin","hall_manager"]`. Because Hotel and Restaurant name their managers explicitly, a `hall_manager` token is refused there by the same `requireRole` check every other route uses — the isolation falls out of the existing pattern instead of being special-cased. Super Admin retains access everywhere.
- Guest enquiry cancellation proves ownership by matching the enquiry email or the logged-in user, never by the reference alone — the same rule as hotel bookings and table reservations.
- `adminNotes` is stripped from the public enquiry lookup.
- No new npm package, no new environment variable.

### Deliberately absent — do not add without a `RULES.md` change
- **No payment anywhere in this module.** No amount, advance, `paymentStatus`, Razorpay order or invoice field on `HallEnquiry`. `RULES.md` §14: hall bookings are approval-first, and payment is triggered only after approval, offline.
- **No numeric price field.** `HallPackage.priceLabel` is free text defaulting to `"On request"` because the owner has not set pricing and the model may turn out to be per-plate rather than per-event. Catering carries no price at all — it is showcase content with no cart, order or quote endpoint.
- **`approved` does not hold the date.** Only `confirmed` writes a calendar block. Several families can be in conversation about the same auspicious date, and showing it as gone would lose the others.

### Verification — what was actually exercised
- `tsc --noEmit` in **backend**, **frontend** and **admin-panel** → **0 errors** in all three.
- `next build` → **frontend 40 routes** (8 new under `/marriage-hall`), **admin-panel 22 routes** (`/halls`, `/halls/[hallId]`, `/enquiries` new). Both succeed.
- Live HTTP against the running server:
  - `GET /halls` → 200 · `GET /halls/nope` → 404 · `GET /hall-enquiries/reference/NOPE` → 404
  - `GET /admin/halls/enquiries/list` → **401** without a token · same for `/calendar` and `/reviews`
  - `POST /hall-enquiries` with `{}` → **400** with all seven per-field errors
  - **Hotel/Restaurant regression:** `/health` 200 · `/hotels` 200 · `/restaurants` 200 · `/hotel-bookings/reference/NOPE` 404 · `/table-reservations/reference/NOPE` 404
- **Not done — the seed did not run, and no page was viewed with real hall data.** `npx ts-node ../database/seeders/seed-marriage-hall.ts` fails from this environment with `querySrv ECONNREFUSED` — the shell cannot resolve the MongoDB Atlas SRV record (the already-running backend, started earlier, connects fine). The script itself compiles and reaches the connection step. **Run it once and the whole vertical populates.** Until then `/halls` returns `[]` and every hall page renders its empty state.
- Consequently: no browser click-through of the public pages or the admin write paths. Build, types, route wiring and endpoint shapes are verified; visual rendering and CRUD execution are not. Manual test steps are in the handover.

---

## [2026-08-03] — Phase 5.0: Admin Console — full UI/UX redesign + Restaurant Admin

**Frontend-only, admin-panel-only.** No backend file, model, service, controller, route, validation schema, RBAC rule, auth flow, database schema or business rule was touched. `git diff` over `backend/`, `frontend/`, `database/` and `deployment/` is empty. Every screen calls the API endpoints that already existed.

Two things happened together, because the second could not be described as a redesign without the first being true:

1. The Hotel Admin was rebuilt on a proper Admin Design System.
2. **The Restaurant Admin was built.** It did not exist — `admin-panel/src` contained only Login, Dashboard, Hotels, Hotel detail, Room detail and Bookings. The Restaurant backend (`/api/v1/admin/restaurants`) had been complete since Phase 4.0 with zero UI consuming it.

### Added — Admin Design System
- **`admin-panel/tailwind.config.js`** — a neutral SaaS token set: `surface` / `line` / `ink` neutral ramps, an indigo `brand` accent, semantic `success` / `warning` / `danger` / `info`, a 12px type floor, soft shadow scale, named z-index layers and four motion primitives.
  **This is deliberately NOT the public site's palette.** `docs/DESIGN_SYSTEM.md` (ink / gold / cream, display serif, luxury hospitality) governs `frontend/` and is unchanged. An admin console is a productivity tool, so it follows Stripe / Linear / Vercel conventions instead. The two systems must not be cross-imported; both config files now say so in a header comment.
- **`admin-panel/src/app/globals.css`** — the component layer every page composes from: `.btn-*`, `.card*`, `.input` / `.field-*`, `.dt` (data table), `.badge-*`, `.nav-item*`, `.tab*`, `.skeleton`, `.page-shell`. Includes a global focus-visible ring and a `prefers-reduced-motion` block.

### Added — UI primitives (`admin-panel/src/components/ui/`)
`Button`, `Field` (TextInput / TextArea / Select / Toggle / Checkbox), `Modal` + `Drawer`, `Tabs` + `SegmentedControl`, `Accordion`, `Dropdown` (row action menus), `DataTable`, `ImageUploader`, `StatCard`, `PageHeader` + `Breadcrumbs`, `Lightbox`, `States` (skeletons / empty / error).

- **`DataTable`** is the single table used everywhere: search, multi-column sort, pagination, checkbox selection with a bulk-action bar, per-row action menu, per-column responsive hiding, and its own loading / empty / error / no-search-match states. Search, sort and paging are **client-side by design** — every admin list endpoint in this backend returns a complete array and there is no `?page=` to hook into. Noted in the component so nobody "fixes" it blindly.
- **`ImageUploader`** replaces the old `<input type="file">` + `file / camera / URL` radio group. Drag & drop, multi-select, device camera, paste-a-URL, thumbnail previews, per-file progress bars, reorder, set-cover and delete. It still emits a plain `string[]` of Cloudinary `secure_url`s, because that is exactly what the models store — the upload contract did not change.
- **`Toast`** and **`ConfirmDialog`** were rewritten. The previous versions referenced Tailwind classes (`charcoal`, `gold`, `beige`, `font-body`) that **did not exist in the admin panel's config** (`theme.extend` was empty) — they were unused copies of public-site components and would have rendered unstyled. Every `alert()` and `window.confirm()` in the panel now routes through them.

### Added — Application shell
- **Permanent collapsible left sidebar** with the agreed structure: Dashboard · Business (Hotel / Restaurant / Marriage Hall) · Operations (Bookings, Customers) · Content (Gallery, Reviews, Offers, FAQs) · Workspace (Analytics, Users, Settings). Collapses to a 64px icon rail; becomes an off-canvas drawer below `lg`. Collapse state persists.
- **Sticky top header** — global search, data refresh, public-site link, notification tray, profile dropdown.
- **Business selector** — two levels: vertical (Hotel / Restaurant) then property within it. Marriage Hall is rendered but locked, because no `/api/v1/admin/halls` module exists. The property level exists even with one property per vertical so a second one needs no UI change.
- **Command palette (Ctrl/⌘-K)** — jumps to any page, property, booking reference or reservation reference. Issues no requests; it filters data the session already holds.
- **Notification tray** — derived from real state (bookings awaiting payment, reviews awaiting moderation, today's check-ins, today's covers). Each entry deep-links to the filtered list. There is no notifications endpoint and none was invented.
- **`Bookings` is business-aware** — points at `/bookings` for Hotel and `/reservations` for Restaurant, labelled to match. Both routes always exist and can be linked directly.

### Added — Restaurant Admin (new)
- **`/restaurants`** — property list with create.
- **`/restaurants/[restaurantId]`** — tabbed workspace: Overview · Categories · Menu · Dining areas · Gallery · Offers · FAQs · Reviews.
- **`/restaurants/[restaurantId]/dining-areas/[areaId]`** — details · photos · table-availability overrides.
- **`/reservations`** — the reservation book: status filters, date-window filters, dining-area filter, bulk seat / complete / no-show / cancel, and a detail drawer showing occasion and special requests.
- Menu management covers categories (with per-category dish counts, so a delete the API would reject with a 409 is explained up front) and dishes (veg/non-veg/egg marker, spice level, chef's special, today's special, availability toggle, tags, photo, duplicate-as-new).
- The dining-area availability form exposes the "omit the time slot to block the whole day" contract explicitly rather than leaving it implicit.

### Added — Cross-vertical pages
`/customers`, `/analytics`, `/gallery`, `/reviews`, `/offers`, `/faqs`, `/users`, `/settings`, `/halls`.

- **`/customers` is derived, not fetched.** There is no admin route that lists users, and guest checkout means most customers never register. The directory is assembled from bookings and reservations keyed on guest email — the same identity the backend's ownership checks use. The page says so on its face rather than implying a CRM exists.
- **`/analytics`** — revenue trend, volume, booking-status mix and covers-by-area, computed client-side with `recharts` (already a dependency). There is no reporting endpoint; if these lists ever outgrow client-side aggregation the fix is a server-side route, which the page notes.
- **`/users`** shows the signed-in account from `GET /auth/admin/me` and documents the three roles. It **cannot** create or edit admins — there is no signup route and no admin-list route, by design. Stated plainly instead of shipping a dead form.
- **`/halls`** is an honest placeholder that records how Hall bookings must differ from Hotel (approval before payment, reuse the polymorphic content module).

### Changed — existing pages
- **Dashboard** — from two inline-styled links to summary tiles (today's check-ins, today's reservations, awaiting payment, reviews to moderate, confirmed revenue, month revenue, live offers, gallery images), business cards and four live activity lists.
- **`/hotels`** — data table with search, sort and row actions, replacing the inline stacked create form.
- **`/hotels/[hotelId]`** — was a single 1,003-line page rendering the property form, rooms, offers, gallery, FAQs and reviews all at once. Now a tabbed workspace over the **same endpoints**, with property counters. Gallery / Offers / FAQs / Reviews moved into shared managers.
- **`/hotels/[hotelId]/rooms/[roomId]`** — split into Details · Photos · Availability, so the availability tool is no longer below a long form.
- **`/bookings`** — filters (status + date window), stat tiles, bulk check-in / check-out / complete / cancel, and a detail drawer. Status changes still go through `PUT /admin/hotels/bookings/:id/status` only.
- **`/login`** — two-column sign-in with inline validation and a show-password toggle. Same `POST /auth/admin/login` call and same token storage.
- **`RequireAdmin`** keeps its exact import contract (every page still wraps itself in it) but now renders the shell instead of a bare header. Providers moved to the root layout so they are not remounted — and refetched — on every navigation.

### Changed — shared content managers
`GalleryManager`, `OffersManager`, `FaqManager` and `ReviewsManager` (`admin-panel/src/components/content/`) are written once and used by both verticals, taking `/admin/hotels` or `/admin/restaurants` as a base path. This mirrors the backend's polymorphic content module rather than forking per vertical — the same rule `RULES.md` applies server-side.

`ReviewsManager` hides the per-image remove control for Restaurant, because only the Hotel module exposes `DELETE /reviews/:id/images`. Rendering a button that would 404 was the alternative.

### Changed — `admin-panel/src/lib/api.ts` (additive)
- `uploadRestaurantImage()` added for `POST /admin/restaurants/upload-image`; `uploadImage()` now delegates to a shared `uploadTo()` helper and is otherwise unchanged. `adminApi.upload` still points at the hotel route, so existing call-sites behave identically.
- Uploads now honour the same global 401 → `/login` bounce that `request()` already had.
- `publicGet()` added for the public aggregate reads several admin screens depend on.
- `request()` no longer rejects when the API is unreachable; it returns the standard `{ success: false, message }` envelope so pages render their error state instead of throwing.

### Fixed
- `alert()` / `window.confirm()` are gone from the admin panel — every success, failure and destructive confirmation now uses the toast and dialog system, with per-field validation errors from `formatApiError()` shown as a second line rather than one blob.
- Deleting a room, hotel, review or gallery image no longer relies on a native browser dialog whose text could not explain the backend's guard rules.

### Security
- No change to authentication, authorization or RBAC. `RequireAdmin` remains **UX only**; every request is re-authorised server-side by `authenticate("admin")` + `requireRole(...)`. The `/users` page documents the role model but cannot alter it.
- The admin console is marked `robots: { index: false, follow: false }` in the root layout. This is the opposite of the public site's SEO requirement and is intentional — admin pages sit behind auth and must never be indexed.
- No new dependency was added. No secret is read or printed client-side.

### Environment
- `NEXT_PUBLIC_FRONTEND_URL` (optional, new) — public site origin, used only by the "View public page" links. Falls back to `http://localhost:3000`. Documented in `admin-panel/.env.example`.

### Verification — what was actually exercised
- `npx tsc --noEmit` in `admin-panel` → **0 errors**.
- `npx next build` → **succeeds, 20 routes** (16 static, 4 dynamic). Three pages (`/bookings`, `/reservations`, `/reviews`) needed a `Suspense` boundary around `useSearchParams()` to prerender; added with skeleton fallbacks.
- `git diff --stat -- backend database frontend deployment` → **empty**, confirming the no-backend-change constraint.
- Live-payload field verification against the running API — every field the new screens read was confirmed present in the real responses: hotel aggregate (`hotel`, `rooms` incl. `maxOccupancy` / `totalRooms` / `images`, `gallery`, `faqs`, `offers`), restaurant aggregate (`restaurant`, `menuCategories`, `menuItems` incl. `categoryId` / `foodType` / `isChefSpecial` / `isTodaysSpecial` / `isAvailable` / `tags`, `diningAreas` incl. `areaType` / `totalTables` / `maxPartySize` / `minPartySize` / `features`, `gallery`, `faqs`, `offers`), and `reservationSlots` / `reservationDurationMinutes` / `maxPartySize` / `averageCostForTwo` / `cuisineTypes`.
- **Not done: no browser-driven click-through of the authenticated screens.** Browser tooling was unavailable in this session and no admin credentials were used, so every write path (create / edit / delete / upload / status change) is verified by build, types and endpoint-shape review — **not by execution**. `TESTING_GUIDE.md` does not exist in this repo and `jest` has no tests or config, so per `AI_INSTRUCTIONS.md` §16 a manual test script is supplied in the handover instead. Sign the redesign off only after running it.

### Known limitations carried forward (not introduced here)
- **SEO meta fields can't be pre-filled on edit.** The public aggregates don't return `metaTitle` / `metaDescription`, so both property forms start blank and only send those fields when filled. Identical to the previous behaviour; fixing it needs an admin read route.
- **Offers list shows current offers only.** `contentService.getActiveOffers` filters by date server-side, so expired offers exist in the database but cannot be listed or edited. The empty state says so.
- **FAQs have no update route** — editing means delete and re-add. The form says so instead of offering an Edit action that would 404.
- **Bulk actions loop client-side**, one request per record, because no batch endpoint exists. Partial failures are counted and reported.
- The **booking / reservation double-book race** is untouched and still belongs to the shared Booking Engine item.

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
