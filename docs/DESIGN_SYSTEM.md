# DESIGN_SYSTEM.md — 7 Vachan

**Status:** Living document. Established in Phase 3.8 (2026-08-02) while building the Hotel public site.

**Scope:** The public customer-facing website (`frontend/`). The Admin Panel is a separate, utilitarian UI and deliberately does **not** follow this system.

> **Read this before building the Marriage Hall or Restaurant front-end.**
> Those verticals must **reuse** this system, not fork it. Per `AI_INSTRUCTIONS.md` §6
> and §15, shared UI and shared logic live once. If a vertical needs something new,
> add it to the tokens here so every vertical gets it — do not create a parallel
> palette, a second button style, or a second motion library.

---

## 1. Where the system actually lives

Two files define everything. Change them, and every page follows.

| File | Owns |
|---|---|
| `frontend/tailwind.config.js` | Colour tokens, type scale, easing, shadows, radii, keyframes |
| `frontend/src/app/globals.css` | Component classes, layout rhythm, print styles, reduced-motion |

Never hardcode a hex value, a font stack, or a duration in a component. If it isn't
in the tokens, add it to the tokens.

---

## 2. Typography

**Pairing:** a high-contrast luxury serif for display, a geometric sans for body —
the standard vocabulary of high-end hospitality.

| Role | Family | Loaded as |
|---|---|---|
| Display / headings | **Cormorant Garamond** (300, 400, 500, 600) | `--font-display` |
| Body / UI | **Jost** (300, 400, 500, 600) | `--font-sans` |

Both via `next/font/google` in `frontend/src/app/layout.tsx`, which **self-hosts the
files at build time**. There is no runtime dependency on `fonts.googleapis.com`.
(This supersedes the earlier system-font decision from Phase 3.7 — the original
concern was CDN dependency, which self-hosting removes.)

### Scale

Display sizes are fluid via `clamp()` — they scale with the viewport, so there are
no per-breakpoint heading overrides.

| Token / class | Use |
|---|---|
| `text-display-xl` / `.hero-title` | Home hero headline only |
| `text-display-lg` / `.page-title` | Page `<h1>` |
| `text-display-md` / `.section-title` | Section `<h2>` |
| `text-display-sm` | Sub-section, auth card headings |
| `.card-title` | Card/article headings (22–24px) |
| `.lead` | Intro paragraph under a heading (17–18px) |
| `.body-muted` | Supporting body copy (15px) |
| `.meta` | Uppercase micro-label (12px + wide tracking) |
| `.section-eyebrow` | Gold overline above a heading, with hairline flourish |
| `.price` | Serif tabular numerals for money |

### Two hard rules

1. **Minimum 12px, and 12px only for uppercase labels with wide tracking.**
   Running text never goes below 15px. Body base is 16px / 1.7.
2. **Uppercase + wide tracking is for labels and buttons only** — never for
   navigation or running text. (The navbar was uppercase in an early build and
   read as a toolbar; Title Case at 15px reads as a hotel menu.)

---

## 3. Colour

| Token | Hex | Use |
|---|---|---|
| `ink` | `#14120f` | Headings, dark sections |
| `ink-light` | `#211d18` | Raised surface on dark |
| `ink-soft` | `#302a22` | Subtle dark surface |
| `gold` | `#b08d57` | **The** brand accent |
| `gold-light` | `#d9be8e` | Accent on dark backgrounds |
| `gold-dark` | `#8a6a3d` | Accent text on light (contrast-safe) |
| `gold-pale` | `#efe2cb` | Hairlines, subtle fills |
| `cream` | `#faf7f2` | Page background |
| `cream-dark` | `#f2ebe0` | Alternating section background |
| `cream-deep` | `#e8dccb` | Dividers on cream |
| `warm-400` | `#6f6558` | Lightest permitted body text |
| `warm-500` | `#5c5449` | Standard body copy |
| `warm-600` | `#4a433a` | Emphasised body copy |

### Contrast rule (non-negotiable)

**`warm-400` is the lightest colour allowed for text.** Measured on the cream
background: `warm-400` 5.3:1, `warm-500` 6.5:1, `warm-600` 8.1:1 — all clear
WCAG AA for normal text.

The palette originally used `#a1978b` / `#8a7f72`, which measured **2.4:1 and
3.6:1** and failed AA. Do not reintroduce lighter greys for text. Decorative
non-text elements (hairlines, icon fills) may go lighter.

On gold: use **ink text on gold**, never cream. Cream on `gold` is ~2.6:1 and fails.

---

## 4. Layout & spacing

| Class | Meaning |
|---|---|
| `.container-luxe` | The one page container — `max-w-content` (76rem) + responsive padding |
| `.section` | Standard vertical rhythm (`py-20 → py-32`) |
| `.section-tight` | Reduced rhythm for secondary sections |
| `rounded-luxe` (1.5rem) / `rounded-airy` (2rem) | The only two large radii |

Every page uses `.container-luxe`. Do not invent per-page `max-w-*` + `px-*`
combinations — that is what made the pages feel like separate projects before.

**Do not centre every heading.** Alternate centred and left-aligned/asymmetric
section headers; uniformly centred headings are the strongest "template" signal.

---

## 5. Components

| Class | Notes |
|---|---|
| `.btn-primary` | Ink pill, gold sheen wipes across on hover |
| `.btn-outline` | Hairline border, same sheen |
| `.btn-gold` | Gold fill — for use on dark/photographic backgrounds |
| `.btn-ghost-light` | Outline for dark backgrounds |
| `.btn-arrow` | Pair with `group` on the button; arrow steps forward |
| `.link-arrow` | Text link with self-animating arrow (no `group` needed) |
| `.card-luxe` + `.card-hover` | Standard card, and its lift-on-hover behaviour |
| `.glass` / `.glass-dark` | Frosted panels (booking widget, auth card) |
| `.media` + `.media-zoom` | Image clip + hover zoom (parent needs `group`) |
| `.scrim` / `.scrim-soft` | Legibility gradient over photography |
| `.skeleton` | Shimmer placeholder (pure CSS, no JS) |
| `.field` / `.field-label` | Form control and its label |
| `.rule-fade` | Hairline that fades out at both ends |

**Buttons:** the gold sheen is a `::before` on each variant class. It cannot be
`@apply`-ed — `@apply` copies utilities only, not pseudo-element rules. Add new
variants to the grouped selector in `globals.css`, don't `@apply btn-base`.

---

## 6. Motion

All primitives live in `frontend/src/components/motion/` and are
**vertical-agnostic — reuse them for Hall and Restaurant.**

| Component | Use |
|---|---|
| `Reveal` | The workhorse scroll reveal (direction, delay, distance) |
| `Stagger` / `StaggerItem` / `StaggerScaleItem` | Grid and list reveals |
| `TextReveal` | Word-by-word masked headline entrance |
| `Parallax` | Spring-smoothed scroll drift for feature imagery |
| `LuxeImage` | Skeleton → fade-in, hover zoom, Cloudinary sizing |
| `PageTransition` | Route entrance (in root layout) |
| `ScrollProgress` | Hairline gold progress bar |
| `AnimatedNumber` | Count-up for rates |
| `variants.ts` | The shared timing vocabulary — import from here |

### Motion rules

1. **Animate only `opacity` and `transform`.** Never width/height/top/left —
   those trigger layout. (The FAQ accordion animates height deliberately and is
   the one exception; it is small and isolated.)
2. **One easing:** `EASE_LUXE` = `cubic-bezier(0.22, 1, 0.36, 1)`, mirrored in
   Tailwind as `ease-luxe`. Slow deceleration reads as luxury; springy reads as app.
3. **Durations 0.35–1.1s.** Reveals ~0.7s, cinematic moments ~1.4s.
4. **Always honour `prefers-reduced-motion`.** Every primitive checks
   `useReducedMotion()`; `globals.css` covers the CSS-driven animations.
5. **`viewport={{ once: true }}`** — content should never re-animate on scroll-back.
6. Framer Motion's `layoutId` is **not used** — see the LazyMotion note in §8.

---

## 7. Imagery

- Always route Cloudinary URLs through `cldImage()` / `cldSrcSet()` in
  `frontend/src/lib/imageUrl.ts`. Cloudinary optimises format and compression at
  upload but **not dimensions**, so an original is delivered at full resolution
  unless a width is requested.
- Use the shared widths in `IMAGE_WIDTHS` (`thumb` / `card` / `hero` / `full`) —
  a small set maximises CDN cache hits.
- `c_limit` only scales down; it never crops or upscales, so the admin's framing
  is preserved.
- Never mount an entire image carousel at once; mount the visible frame plus the
  next one (see `RoomCard`).
- Stored data is unaffected — models keep the original `secure_url`
  (`AI_INSTRUCTIONS.md` §21).

**Operational note:** as of 2026-08-02 the Hotel's room/gallery images are
external URLs (Google Images thumbnail cache, stock sites), not Cloudinary
uploads, so the transforms are inert on that data. Upload through the admin
panel's Cloudinary endpoint and they activate automatically.

---

## 8. Known gaps

- **`LazyMotion` conversion is unfinished.** Framer Motion currently ships its
  full feature set (~40–50KB gzip) on nearly every route. Converting `motion` →
  `m` with `LazyMotion features={domAnimation}` would cut ~13KB per page. The
  blocker (`layoutId`) has already been removed from `GalleryGrid`, so the path
  is clear — this is why `layoutId` must not be reintroduced.
- **No browser/visual verification** has been done on the Phase 3.8 work; it is
  verified only by `next build` and `tsc --noEmit`.

---

## 9. Checklist for a new vertical (Hall / Restaurant)

- [ ] Use `.container-luxe` and `.section` — no bespoke container widths
- [ ] Use `PageHeader` for every sub-page header (it also emits breadcrumb JSON-LD)
- [ ] Reuse `components/motion/*` — do not add another animation library
- [ ] Reuse the `.btn-*` and `.card-luxe` families — do not create new button styles
- [ ] Reuse the shared `content/` backend module for reviews/gallery/FAQs/offers
      (`PROJECT_DOCUMENTATION.md` §5) rather than new models
- [ ] Route all images through `cldImage()`
- [ ] Keep body text at `warm-400` or darker; nothing under 12px
- [ ] Add `loading.tsx` with `Skeleton` components for any data-backed route
- [ ] Per-page `generateMetadata`, canonical URL, and JSON-LD (`AI_INSTRUCTIONS.md` §9)
- [ ] Remember Hall bookings are **enquiry → admin approval → payment**, unlike
      Hotel's instant confirmation (`RULES.md` §2) — the booking UI differs even
      though the visual language does not
