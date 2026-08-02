# DESIGN_SYSTEM.md — 7 Vachan

**Status:** Living document. Established Phase 3.8, extended Phase 3.9 (2026-08-02).
**Design reference:** the **Hotel Module** public website.
**Scope:** the public customer-facing site (`frontend/`). The Admin Panel is a
separate, utilitarian UI and deliberately does **not** follow this system.

> **The Admin Console has its own design system** (added 2026-08-03): neutral
> SaaS tokens in `admin-panel/tailwind.config.js` + component classes in
> `admin-panel/src/app/globals.css`, documented in
> `PROJECT_DOCUMENTATION.md` §7. The two are intentionally separate — never
> import `gold` / `cream` / `font-display` into `admin-panel/`, and never import
> the admin's neutral ramp into `frontend/`.

> **Documentation only.** This file describes what the code already does. It
> introduces no new rules that the Hotel Module does not already follow.

> **Marriage Hall and Restaurant must reuse this system, not fork it.**
> `AI_INSTRUCTIONS.md` §6 and §15 require shared UI and shared logic to live once.
> See §23 for the per-module checklist.

### Where the system physically lives

| File | Owns |
|---|---|
| `frontend/tailwind.config.js` | Colour, type scale, easing, shadows, radii, keyframes → **CSS utilities** |
| `frontend/src/app/globals.css` | Component classes, layout rhythm, print, reduced-motion |
| `frontend/src/lib/theme.ts` | The same tokens as **TypeScript values** (for JS that needs a real number) |
| `frontend/src/components/ui/` | Shared UI primitives |
| `frontend/src/components/motion/` | Shared motion primitives |
| `frontend/src/lib/format.ts` | Money / date / night formatters |

Never hardcode a hex, font stack, or duration in a component. If it isn't a token, add it as one.

⚠️ **`tailwind.config.js` and `lib/theme.ts` mirror each other by hand.** Tailwind's
config is CommonJS and `allowJs` is `false` in tsconfig, so neither can import the
other. **Change a colour or duration in both.**

---

## 1. Brand Identity

**7 Vachan** — "seven vows" — a premium hospitality brand in Satna, Madhya Pradesh.
One property today (hotel + marriage hall + restaurant), architected multi-branch
from day one (`RULES.md` §1).

The design language is **quiet luxury**, not loud luxury:

| Principle | In practice |
|---|---|
| **Restraint over decoration** | Hairlines, not borders. Scrims, not overlays. One accent colour. |
| **Photography leads** | Imagery is the hero; type sits over it, never competes. |
| **Slow, decelerating motion** | Springy/bouncy motion reads as "app". Slow ease-out reads as expensive. |
| **Editorial, not template** | Asymmetric section headers, oversized numerals, print-style rules. |
| **Warm, never cold** | Warm neutrals throughout. No pure black, no pure grey, no blue-grey. |
| **Honest** | No invented avatars, fake reviews, or fabricated statistics. |

The emotional target: a visitor should feel **trust and calm**, and be persuaded
to book because the property looks well-run — not because a banner shouted at them.

---

## 2. Colour Palette

### Primary — Ink (deep warm charcoal)
Headings, dark sections, primary buttons.

| Token | Hex | Use |
|---|---|---|
| `ink` | `#14120f` | Body text, headings, dark section backgrounds |
| `ink-light` | `#211d18` | Raised surface on a dark section (hover states) |
| `ink-soft` | `#302a22` | Subtle dark surface |

### Accent — Gold
**The** brand colour. Used sparingly: eyebrows, icons, hairlines, one CTA per view.

| Token | Hex | Use |
|---|---|---|
| `gold` | `#b08d57` | Primary accent, icons, active states |
| `gold-light` | `#d9be8e` | Accent **on dark** backgrounds (auth card, footer) |
| `gold-dark` | `#8a6a3d` | Accent **text on light** — contrast-safe |
| `gold-pale` | `#efe2cb` | Hairlines, very subtle fills |

### Secondary / Background — Cream
| Token | Hex | Use |
|---|---|---|
| `cream` | `#faf7f2` | Page background |
| `cream-dark` | `#f2ebe0` | Alternating section background, skeleton base |
| `cream-deep` | `#e8dccb` | Dividers on cream |

### Text — Warm neutrals
| Token | Hex | Contrast on cream | Use |
|---|---|---|---|
| `ink` | `#14120f` | 15.8:1 | Headings, emphasis |
| `warm-600` | `#4a433a` | 8.1:1 | Emphasised body copy (`.lead`) |
| `warm-500` | `#5c5449` | 6.5:1 | Standard body copy (`.body-muted`, `.meta`) |
| `warm-400` | `#6f6558` | 5.3:1 | **Lightest permitted for text** |

### Status colours
Only for booking status and form feedback. Deliberately **muted** — a saturated
green pill on a confirmation page is the least on-brand element possible.

| Status | Classes |
|---|---|
| `pending`, `refund_pending` | `border-amber-300/60 bg-amber-50 text-amber-800` |
| `confirmed` | `border-gold/40 bg-gold/10 text-gold-dark` |
| `checked_in` | `border-sky-300/60 bg-sky-50 text-sky-800` |
| `checked_out`, `completed`, `refunded` | `border-ink/15 bg-ink/[0.04] text-ink/70` |
| `cancelled` | `border-red-300/60 bg-red-50 text-red-700` |

Never hand-write these — use `<StatusBadge status={…} />` (§21). The vocabulary is
owned by the backend (`updateBookingStatus` in `booking.service.ts`).

### Two colour rules — non-negotiable

1. **`warm-400` is the lightest colour allowed for text.** The palette originally
   used `#a1978b` / `#8a7f72`, measuring **2.4:1 and 3.6:1** — both failed WCAG AA.
   Do not reintroduce lighter greys for text. Decorative non-text elements
   (hairlines, icon washes) may go lighter.
2. **On gold, use ink text — never cream.** `cream` on `gold` is ≈2.6:1 and fails.
   `ink` on `gold` is ≈6:1.

---

## 3. Typography

**Pairing:** high-contrast luxury serif + geometric sans — the standard vocabulary
of high-end hospitality.

| Role | Family | Weights | CSS variable |
|---|---|---|---|
| Display / headings | **Cormorant Garamond** | 300, 400, 500, 600 | `--font-display` |
| Body / UI | **Jost** | 300, 400, 500, 600 | `--font-sans` |

Loaded with `next/font/google` in `src/app/layout.tsx`, which **self-hosts the
files at build time** — no runtime dependency on `fonts.googleapis.com`, and no
layout shift. (This supersedes the Phase 3.7 system-font decision; the original
concern was CDN dependency, which self-hosting removes.)

### Base
| Property | Value |
|---|---|
| Body size | `1rem` (16px) |
| Body line-height | `1.7` |
| Body weight | `300` (light) |
| Heading weight | `400` normal / `500` medium — **never bold** |

### Display scale — fluid via `clamp()`
Scales with viewport, so headings need no per-breakpoint overrides.

| Token | Clamp | Line-height | Tracking |
|---|---|---|---|
| `text-display-xl` | `clamp(3.25rem, 2rem + 6vw, 6.5rem)` | 1 | −0.025em |
| `text-display-lg` | `clamp(2.75rem, 1.9rem + 4vw, 4.75rem)` | 1.05 | −0.02em |
| `text-display-md` | `clamp(2.25rem, 1.7rem + 2.6vw, 3.5rem)` | 1.1 | −0.015em |
| `text-display-sm` | `clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)` | 1.15 | −0.01em |

### Semantic classes — use these, not raw sizes
| Class | Role | Size |
|---|---|---|
| `.hero-title` | Home hero `<h1>` only | `display-xl`, cream |
| `.page-title` | Page `<h1>` | `display-lg` |
| `.section-title` | Section `<h2>` | `display-md` |
| `.card-title` | Card / article heading | 22px → 24px, medium |
| `.lead` | Intro paragraph under a heading | 17px → 18px, `warm-600` |
| `.body-muted` | Supporting body copy | 15px, `warm-500` |
| `.meta` | Uppercase micro-label | 12px, `tracking-luxe`, `warm-500` |
| `.section-eyebrow` | Gold overline (with hairline flourish) | 12px, `tracking-eyebrow` |
| `.field-label` | Form label | 11px, uppercase, `tracking-luxe` |
| `.price` | Money figures | serif, medium, `tabular-nums` |

### Letter spacing
| Token | Value | Use |
|---|---|---|
| `tracking-eyebrow` | `0.32em` | Eyebrows, micro-labels |
| `tracking-luxe` | `0.18em` | Buttons, meta text, nav-adjacent labels |
| `tracking-[0.14em]` | — | Buttons (inside `.btn-*`) |

### Two type rules
1. **Minimum 12px, and 12px only for uppercase labels with wide tracking**
   (which read a full step larger than their nominal size). Running text never
   goes below 15px.
2. **Uppercase + wide tracking is for labels and buttons only** — never for
   navigation or running text. The navbar was uppercase in an early build and read
   as a toolbar; Title Case at 15px reads as a hotel menu.

> **Known deviation:** several components still use `text-[11px]` for micro-labels,
> below the stated floor. Correcting it is a visual change and was out of scope for
> the architecture-only phase. Fix opportunistically, don't batch it.

---

## 4. Spacing Scale

**The project uses Tailwind's default spacing scale unchanged** — no custom
`spacing` key exists in `tailwind.config.js`. `1` = `0.25rem` = 4px.

Values actually used, and what for:

| Step | px | Typical use |
|---|---|---|
| `1.5`–`2.5` | 6–10px | Icon-to-label gaps, chip padding |
| `3`–`4` | 12–16px | Tight stacks, grid gaps on mobile |
| `5`–`6` | 20–24px | Card inner gaps, grid gaps |
| `7`–`9` | 28–36px | Card padding, form field spacing |
| `10`–`12` | 40–48px | Card padding (desktop), block separation |
| `14`–`16` | 56–64px | Section header → content |
| `20`–`32` | 80–128px | Section vertical rhythm (via `.section`) |

**Rhythm classes** (use these instead of hand-rolling padding):

| Class | Padding |
|---|---|
| `.section` | `py-20` → `sm:py-24` → `lg:py-32` |
| `.section-tight` | `py-14` → `sm:py-16` → `lg:py-20` |

---

## 5. Border Radius

| Token | Value | Use |
|---|---|---|
| `rounded-full` | 9999px | Buttons, chips, avatars, pagination, icon circles |
| `rounded-airy` | `2rem` | Large feature imagery, auth card |
| `rounded-luxe` | `1.5rem` | Cards, panels, lightbox image |
| `rounded-xl` | `0.75rem` | Inputs, small thumbnails |
| `rounded-lg` | `0.5rem` | Very small thumbnails |

Only two large radii exist on purpose. Don't introduce a third.

---

## 6. Shadows

| Token | Value | Use |
|---|---|---|
| `shadow-luxury` | `0 18px 50px -18px rgba(20,18,15,0.18)` | Default card resting state |
| `shadow-lift` | `0 32px 70px -24px rgba(20,18,15,0.32)` | Card hover, floating panels |
| `shadow-gold` | `0 16px 40px -16px rgba(176,141,87,0.45)` | Gold CTA hover |
| `shadow-inset` | `inset 0 1px 0 0 rgba(255,255,255,0.06)` | Top highlight on dark surfaces |

All are **wide, soft and low-opacity** — a tight dark shadow reads as Material
Design, not hospitality. Never use Tailwind's default `shadow-md`/`shadow-lg`.

---

## 7. Buttons

### Anatomy (shared by every variant)
Pill · `px-8 py-4` · 14px · uppercase · `tracking-[0.14em]` · medium ·
`duration-400 ease-luxe` · `isolation: isolate`

Every variant has a **gold sheen**: a `::before` panel that wipes in from the left
beneath the label on hover, plus `active:scale-[0.98]`.

### Variants
| Class | Appearance | Use |
|---|---|---|
| `.btn-primary` | Ink fill, cream label | Default action on light backgrounds |
| `.btn-outline` | Hairline border, ink label | Secondary action |
| `.btn-gold` | Gold fill, ink label | Primary action **over photography** / dark |
| `.btn-ghost-light` | Cream hairline, cream label | Secondary over photography |

### Sizes
There is **one** button size. Adjust with `!` overrides only where the layout
demands it — e.g. the navbar CTA uses `!px-7 !py-3.5 !text-[0.8125rem]`. Do not
create `.btn-sm` / `.btn-lg`.

### States
| State | Behaviour |
|---|---|
| Hover | Gold sheen wipes across; label colour flips where needed; shadow appears |
| Active | `scale-[0.98]` |
| Focus | Global gold `:focus-visible` ring (2px, 3px offset) |
| Disabled | `disabled:opacity-60` + `Loader2` spinner and a present-tense label ("Signing in") |

### Companions
| Class | Purpose |
|---|---|
| `.btn-arrow` | Arrow that steps forward — needs `group` on the button |
| `.link-arrow` | Text link with a self-animating arrow (**no `group` needed**) |

⚠️ **`@apply` cannot carry pseudo-elements.** The sheen lives on a grouped
selector listing every variant. If you add a variant, add it to that selector —
`@apply btn-primary` will silently produce a button with no sheen.

---

## 8. Form Elements

### Inputs — underline by default
A stack of boxes reads as data entry; a hairline underline reads as stationery.

| Class | Spec | Use |
|---|---|---|
| `.field-line` | Bottom border `ink/[0.12]`, transparent bg, `py-2.5`, 16px, light | Default input / textarea / select |
| `.field-line-sm` | Same, 14px | Dense filter bars |
| `.field` | Boxed: white bg, `rounded-xl`, `border-ink/10`, `px-4 py-3` | Where a control needs its own surface on a tinted panel |
| `.field-label` | 11px uppercase `tracking-luxe`, `warm-500`, `mb-2` | All labels |

Focus on every input: border → `gold`, no ring (the global `:focus-visible` ring
covers keyboard users).

### Textareas
Same class as inputs, plus `resize-none` and a placeholder that suggests content
("What made your stay memorable?", "Late arrival, high floor, celebration…").

### Selects
Same class as inputs. The "add another room" select uses
`border-dashed border-ink/20` to read as an *additive* control rather than a value.

### Checkboxes
No native checkbox styling. Pattern (see `LoginForm`):
`appearance-none` + `h-4 w-4` + `rounded-sm` + `checked:bg-gold` +
`checked:border-gold`, with an absolutely-positioned lucide `Check` at
`size={11} strokeWidth={3}` revealed by `peer-checked:opacity-100`.

### Steppers over spin-boxes
For quantities (guests, room count), use `−` / `+` circular buttons around a
`tabular-nums` value. A native number spin-box is the least premium control the
browser offers. See `QuickBookingWidget` and `BookingForm`.

### Auth inputs are the exception
On the dark glass auth card, inputs are **solid white, filled, `rounded-xl`, with
the label above** (`components/auth/AuthField.tsx`). Dark-on-dark inputs over
photography are the usual failure mode of that layout; near-black on white clears
contrast whatever photo is behind.

### Validation
- Mirror the backend's rules client-side so the guest isn't told what's wrong only
  after a round-trip (see `SignupForm`'s live password checklist, which mirrors
  `auth.validation.ts`).
- Show errors with `<Alert>` (§21) — never a bare coloured `<p>`.
- Never fake success. If no endpoint exists, say so (`NewsletterForm`, `ContactForm`).

---

## 9. Cards

| Class | Purpose |
|---|---|
| `.card-luxe` | White, `rounded-luxe`, `border-ink/[0.06]`, `shadow-luxury`, `duration-600 ease-luxe` |
| `.card-hover` | `-translate-y-1.5` + `shadow-lift` + `border-gold/25` on hover |
| `.glass` | Frosted light panel — booking widget |
| `.glass-dark` | Frosted dark panel — overlays on imagery |

### Rules
- **Always pair `.card-hover` with `group`** on the same element if children react to hover.
- **Add `w-full`** when a card is a flex child, so cards in a row stay equal height.
- **One link per card.** Use the stretched-link pattern — the title `<Link>` carries
  `after:absolute after:inset-0 after:z-10` so the whole surface is clickable via a
  single accessible link. A secondary "Details" affordance must be a `<span aria-hidden>`,
  not a second link. (Three links to the same URL is the most common a11y bug in card grids.)
- **Oversized index numerals** (`font-display text-7xl text-gold/10`) mark a curated
  set — see `OffersPreview`. Reuse for Hall packages / Restaurant menus.

---

## 10. Icons — Lucide

**`lucide-react` is the only icon library.** Do not add another (`AI_INSTRUCTIONS.md` §19).

### Sizing
| Context | `size` | Examples |
|---|---|---|
| Inline with text | `13`–`15` | Meta rows, link arrows, buttons |
| Standalone UI | `16`–`18` | Nav items, form affordances |
| Feature / circle | `20`–`24` | Amenity tiles, value props, empty states |
| Overlay control | `26`–`34` | Lightbox chevrons, close buttons |

`size={14}` is the most common (51 uses) — the default for button and link icons.

### Stroke weight
**`strokeWidth={1.5}` is the house default** (35 of 49 uses). Lucide's default is
`2`, which is too heavy for this brand.

| Value | Use |
|---|---|
| `1` – `1.25` | Large decorative marks (quote glyphs, big chevrons) |
| **`1.5`** | **Default for everything** |
| `1.75` | Small icons needing a touch more presence |
| `2.5` – `3` | Only inside tiny filled indicators (checkbox tick) |

### Rules
- **Verify an icon exists in the installed version before using it.** Lucide renames
  and removes icons between releases.
- Brand icons (`Instagram`, `Facebook`, `Twitter`, `Youtube`) are **deprecated** in
  the installed version. They still work and are in use in the footer; expect them
  to be removed eventually.
- Decorative icons get `aria-hidden="true"`; icon-only buttons get `aria-label`.
- Free-text amenity names map to icons via `lib/amenityIcons.tsx`, which falls back
  to `Sparkles` rather than breaking on an unexpected value. **Extend that map for
  Hall/Restaurant amenities — don't write a second one.**

---

## 11. Animations & Transitions

### Easing — one curve
| Token | Value |
|---|---|
| `ease-luxe` / `EASE` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `ease-soft` / `EASE_SOFT` | `cubic-bezier(0.4, 0, 0.2, 1)` |

Slow deceleration reads as luxury. Springy reads as "app".

### Durations
| Token | Seconds | Use |
|---|---|---|
| `duration-300` | 0.3 | Colour transitions |
| `duration-400` | 0.4 | Hovers, button sheen, arrows |
| `duration-500` | 0.5 | Underline draws, sheen wipe |
| `duration-600` | 0.6 | Card lift, scrims |
| `duration-900` | 0.9 | Image zoom, crossfades |

TS equivalents in `lib/theme.ts`: `DURATIONS.fast` 0.35 · `.base` 0.7 · `.slow` 0.95
· `.cinematic` 1.4. Carousel intervals live in `INTERVALS`.

### Keyframes
| Animation | Spec | Use |
|---|---|---|
| `animate-ken-burns` | 14s ease-out, scale 1 → 1.12 | Hero / auth backdrop |
| `animate-shimmer` | 1.6s infinite | Skeleton loaders |
| `animate-scroll-hint` | 2s infinite | Hero scroll cue |

### Motion primitives — `components/motion/`
| Component | Use |
|---|---|
| `Reveal` | The workhorse scroll reveal (direction, delay, distance, scale) |
| `Stagger` / `StaggerItem` / `StaggerScaleItem` | Grid and list reveals |
| `TextReveal` | Word-by-word masked headline entrance |
| `Parallax` | Spring-smoothed scroll drift for feature imagery |
| `LuxeImage` | Skeleton → fade-in, hover zoom, Cloudinary sizing |
| `PageTransition` | Route entrance (mounted in root layout) |
| `ScrollProgress` | Hairline gold progress bar |
| `AnimatedNumber` | Count-up for rates |
| `variants.ts` | Shared variants + timing vocabulary |

### Six motion rules
1. **Animate only `opacity` and `transform`.** Never width/height/top/left. (The FAQ
   accordion animates height deliberately — small and isolated, the one exception.)
2. **One easing** — `EASE_LUXE`, everywhere.
3. **Durations 0.35–1.1s.** Reveals ≈0.7s, cinematic moments ≈1.4s.
4. **Always honour `prefers-reduced-motion`.** Every primitive checks
   `useReducedMotion()`; `globals.css` covers the CSS-driven animations.
5. **`viewport={{ once: true }}`** — content must never re-animate on scroll-back.
6. **Never use `layoutId`.** It is the only feature requiring Framer's layout-projection
   bundle (~⅓ of the library). It was deliberately removed; see §22.

### Page transitions
`PageTransition` animates the **entrance** only. In the App Router an
`AnimatePresence` exit cannot delay unmounting — the router swaps server-rendered
children immediately. Don't chase this; the entrance carries the polish.

---

## 12. Responsive Breakpoints

**Tailwind defaults, unchanged** — no custom `screens` key exists.

| Token | Min-width | Typical role |
|---|---|---|
| *(base)* | 0 | Mobile — single column |
| `sm` | 640px | Large phone / small tablet — 2-column grids appear |
| `md` | 768px | Tablet |
| `lg` | 1024px | Laptop — 3-column grids, sticky sidebars, split layouts |
| `xl` | 1280px | Desktop — **full navbar appears** |
| `2xl` | 1536px | Large desktop — wider nav spacing only |

TS access: `BREAKPOINTS` and `mediaUp('lg')` in `lib/theme.ts`.

**The navbar switches at `xl`, not `lg`.** Nine links plus a CTA is cramped below
1280px, and a cramped nav is the fastest way to look inexpensive. Tablet and small
laptop get the full-screen drawer.

---

## 13. Grid & Layout System

### The container
```
.container-luxe   →  mx-auto w-full max-w-content px-6 sm:px-8 lg:px-12
```
`max-w-content` = **76rem**. `max-w-prose` = **44rem** (reading measure).

**Every page uses `.container-luxe`.** Do not invent per-page `max-w-*` + `px-*`
combinations — that is precisely what made pages feel like separate projects before.

### Grid patterns in use
| Pattern | Classes |
|---|---|
| Card grid | `grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3` |
| Tile grid | `grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4` |
| Editorial split | `grid grid-cols-1 lg:grid-cols-12` + `lg:col-span-6/7/5` |
| Hairline-divided row | `grid gap-px bg-ink/[0.07]` with `bg-white` children |
| Photo mosaic | `grid auto-rows-[Npx]` with `row-span-2` on every 3rd tile |

The **hairline-divided** trick (`gap-px` over a tinted parent) avoids double
borders between cells. Reuse it.

### Layout components
| Component | Role |
|---|---|
| `PageHeader` | The single sub-page header — eyebrow + title + lead, **and** emits breadcrumb JSON-LD |
| `.section` / `.section-tight` | Vertical rhythm |
| `.rule-fade` / `.rule-fade-light` | Hairline that fades at both ends — the divider |
| `Skeleton*` | Route-level `loading.tsx` placeholders |

### Composition rule
**Do not centre every heading.** Alternate centred and left-aligned/asymmetric
section headers. Uniformly centred headings are the single strongest "template" signal.

---

## 14. Navbar Guidelines

**Component:** `components/Header.tsx` (shared — reuse as-is for all verticals).

| Aspect | Spec |
|---|---|
| Position | `fixed` — renders its own spacer on non-home routes |
| Height | `h-20` → `lg:h-28`, shrinking to `h-[72px]` → `lg:h-20` on scroll |
| Transparency | Transparent **only** over the home hero; opaque + `backdrop-blur-xl` elsewhere |
| Auto-hide | Hides on scroll-down past 260px, returns on any scroll-up |
| Nav links | **Title Case**, 15px, light, `.nav-link` with a gold underline that draws in |
| Active state | `data-active="true"` → gold + underline held open |
| Right side | "My Bookings" (`Briefcase`) → Login (`User`) / Logout (`LogOut`) → CTA pill |
| CTA | `.btn-gold` when transparent, `.btn-primary` when opaque |
| Breakpoint | Full nav from `xl`; drawer below |
| Drawer | Full-screen `bg-ink/97`, staggered links, body scroll locked |
| Auth pages | Renders **nothing** on `/login` and `/signup` (full-screen backdrop owns the viewport) |

**Adding a vertical:** add entries to `NAV_LINKS`. Beyond ~10 links, revisit the
IA rather than shrinking the type.

---

## 15. Footer Guidelines

**Component:** `components/Footer.tsx` (Server Component — sources contact details
from `getTheHotel()` so no page prop-drills them).

| Aspect | Spec |
|---|---|
| **Height budget** | **220–280px desktop.** Currently ≈275px |
| Structure | 3-column row (`lg:grid-cols-12` → 5 / 3 / 4) + one-line legal bar |
| Column 1 | Wordmark + address + phone + email |
| Column 2 | Link list, two tight columns |
| Column 3 | Newsletter (compact, underline input) + social icons |
| Legal bar | Copyright left, policy links right, `py-5`, 12px |
| Social icons | `h-9 w-9` circles, `size={14}`, gold fill on hover |
| Ambient | One soft `bg-gold/[0.06] blur-[110px]` wash so the dark panel reads as lit |

**It was ≈700px and got cut in half.** What was removed and must not come back:
a full-width reservation CTA band (the header CTA and every room card already
convert), a duplicated link tree, and a long brand paragraph. **The footer appears
on every page — it does not get to be a landing section.**

---

## 16. Section Spacing Rules

1. **Use `.section`** (`py-20 sm:py-24 lg:py-32`) for a standard section;
   `.section-tight` for secondary ones. Never hand-roll section padding.
2. **Section header → content: `mb-14 sm:mb-16`.** `PageHeader` handles this.
3. **Alternate backgrounds** to separate sections — `cream` → `cream-dark` → `ink`.
   Don't stack three same-coloured sections in a row.
4. **A dark section is a punctuation mark**, not a default. One or two per page.
5. **Never stack two CTA bands.** The home page deliberately has no closing CTA
   because the footer opens with one.
6. **Overlap for depth**, sparingly — the booking widget uses `-mt-16 sm:-mt-20` to
   sit over the hero.
7. **Page top padding: `pt-16 sm:pt-20`** below the fixed header.

---

## 17. Image Style Guidelines

### Delivery — always through `cldImage()`
```
lib/imageUrl.ts  →  cldImage(src, { width })   cldSrcSet(src, widths)
```
Cloudinary optimises **format and compression at upload** but **not dimensions**,
so an original is delivered at full resolution unless a width is requested.

| `IMAGE_WIDTHS` | px | Use |
|---|---|---|
| `thumb` | 160 | Thumbnails, review photos |
| `card` | 800 | Room cards, gallery tiles |
| `hero` | 1920 | Hero, mastheads, main room frame |
| `full` | 2400 | Lightbox |

Keep to this small set — it maximises CDN cache hits. `c_limit` only ever scales
**down** and never crops or upscales, so the admin's framing is preserved.

### Presentation
| Class / component | Purpose |
|---|---|
| `.media` | Clipping wrapper (`relative overflow-hidden bg-cream-dark`) |
| `.media-zoom` | The scaling child — parent needs `group` |
| `.scrim` / `.scrim-soft` | Legibility gradient over photography |
| `LuxeImage` | Skeleton → fade-in + de-scale, optional zoom and hover scrim |

### Rules
- **Never mount a whole carousel at once.** Mount the visible frame plus the next
  one (see `RoomCard`). Mounting all frames of all cards is what made a room grid
  pull 15 full-size images on load.
- **Always clear the skeleton on `onError`**, or a broken URL shimmers forever.
- **Reserve aspect ratio** (`aspect-[4/3]`, fixed heights) so decoding never reflows.
- `loading="lazy"` by default; `priority` (eager) only above the fold.
- **Not `next/image`** — sources are arbitrary Cloudinary `secure_url` strings and
  `next/image` would require whitelisting remote hosts in `next.config.js`.
- Stored data is untouched: models keep the original `secure_url`
  (`AI_INSTRUCTIONS.md` §21).

> ⚠️ **Operational issue (2026-08-02):** all 19 Hotel room/gallery images are
> external URLs (mostly `encrypted-tbn0.gstatic.com`, Google's thumbnail cache),
> not Cloudinary uploads — so the transforms are **inert on current data**. Those
> URLs are hotlink-fragile and carry a licensing problem for a production site.
> Uploading via the admin panel's Cloudinary endpoint activates the transforms with
> no code change.

---

## 18. Component Naming Conventions

| Rule | Example |
|---|---|
| Components: `PascalCase.tsx`, one default export | `RoomCard.tsx` |
| Utilities: `camelCase.ts`, named exports | `imageUrl.ts` → `cldImage` |
| Shared UI primitive: plain noun | `Alert`, `Pagination`, `Lightbox` |
| Vertical-specific: prefixed with its noun | `RoomCard`, `RoomSearch`, `HallEnquiryForm` |
| Motion primitive: describes the motion | `Reveal`, `Parallax`, `TextReveal` |
| Page section: describes the section | `FeaturedRooms`, `WhyChooseUs` |
| Skeletons: `Skeleton` + what it mirrors | `SkeletonRoomCard` |
| CSS component class: `kebab-case` | `.card-luxe`, `.field-line-sm` |
| Variant suffix: `-sm` / `-light` / `-dark` | `.field-line-sm`, `.btn-ghost-light` |

### Placement
```
src/components/          shared, vertical-agnostic (Header, Footer, PageHeader, …)
src/components/ui/       shared UI primitives
src/components/motion/   shared motion primitives
src/components/auth/     customer auth presentation
src/modules/<vertical>/components/       vertical-specific
src/modules/<vertical>/components/home/  that vertical's landing sections
src/lib/                 formatters, tokens, API clients, data fetchers
```
**Rule of thumb:** if it names a domain concept (Room, Hall, Table, Menu) it belongs
in `modules/`. Otherwise it belongs in `components/`.

---

## 19. Accessibility Standards

| Requirement | How it's met |
|---|---|
| **Contrast** | `warm-400` (5.3:1) is the lightest text colour. Ink on gold, never cream on gold |
| **Focus visibility** | Global `:focus-visible` — 2px gold outline, 3px offset. Never remove it |
| **Reduced motion** | Every motion primitive checks `useReducedMotion()`; `globals.css` has a full `@media (prefers-reduced-motion: reduce)` block |
| **One link per card** | Stretched-link pattern; secondary affordances are `aria-hidden` spans |
| **Decorative content** | `aria-hidden="true"` on scrims, monograms, index numerals, slide indicators |
| **Icon-only buttons** | Always `aria-label` ("Close", "Next image", "Increase guests") |
| **Split headlines** | `TextReveal` puts the full string on `aria-label` and hides the per-word spans, so AT reads one clean sentence |
| **Modals** | `role="dialog"`, `aria-modal="true"`, `aria-label`, Escape closes, body scroll locked |
| **Keyboard navigation** | Lightbox and room gallery support ←/→/Esc |
| **Form labels** | Every input has a real `<label>` (or `sr-only` where the design hides it) |
| **Errors** | `<Alert>` renders `role="alert"` so changes are announced |
| **Pagination** | `<nav aria-label>` + `aria-current="page"` |
| **Ratings** | `StarRating` is `role="img"` with `aria-label="Rated 4.3 out of 5"` |
| **Images** | Meaningful images get real alt text; decorative ones get `alt=""` |
| **Landmarks** | One `<main>` per page, `<nav aria-label>`, `<footer>` |
| **Non-indexed pages** | Auth pages set `robots: { index: false }` |

**Not yet verified:** no screen-reader pass, no automated axe/Lighthouse audit, no
keyboard-only walkthrough. The above are patterns applied by construction, not
audited outcomes.

---

## 20. UI/UX Rules

1. **Never fake a backend.** If no endpoint exists, say so plainly. The newsletter
   acknowledges locally without claiming to save; the contact form says
   "Send Via WhatsApp"; social login buttons are visibly **disabled**.
2. **Never invent content.** No stock avatars for real reviewers (use `Monogram`),
   no fabricated statistics, no placeholder testimonials.
3. **Never display a number that could contradict a charge.** `nightsBetween()`
   mirrors the backend's `calculateNights`. The GST row on the invoice renders
   **only if** the API supplies tax — deriving 12% client-side would print a total
   that doesn't match what Razorpay charged.
4. **Loading shows structure, not spinners.** Route-level `loading.tsx` with
   skeletons shaped like the real content.
5. **Empty states offer a way forward** — a title, a reason, and an action.
6. **Errors surface the field.** `formatApiError` style: show which field failed,
   not "Validation failed".
7. **Disabled buttons say what's happening** — "Signing in", not a bare spinner.
8. **Date inputs constrain themselves** — `min={today}`, and check-out `min={checkIn}`.
9. **Guest checkout is never blocked.** No booking flow may require login
   (`RULES.md` §2). Auth is an optional convenience.
10. **Respect the fold.** On mobile, the primary action comes before supporting copy
    in the DOM.
11. **One primary CTA per view.** Gold is scarce by design.
12. **Don't animate on every scroll pass** — `once: true`.

---

## 21. Reusable Component List

### Shared UI — `components/ui/`
Each extracted from **real duplication**, none speculative.

| Component | Replaced | Notes |
|---|---|---|
| `Lightbox` | 3 copies | Full-screen viewer. Caller owns `index`/`onClose`. ←/→/Esc, scroll lock, counter, captions |
| `Alert` | 5 copies | `tone` = error/success/info · `variant` = light/dark |
| `EmptyState` | 5 copies | `variant` = quiet (bare line) / card (icon + action) |
| `Pagination` | 2 copies | Caller owns page state |
| `StatusBadge` | 2 copies | The 8 backend booking statuses |
| `Monogram` | 2 copies | Initial-in-a-circle avatar |

### Shared layout & content — `components/`
`Header` · `Footer` · `PageHeader` · `Breadcrumbs` (JSON-LD by default, visual trail
opt-in) · `Skeleton` / `SkeletonText` / `SkeletonRoomCard` / `SkeletonGrid` /
`SkeletonPageHeader` · `StarRating` (true partial fills) · `GalleryGrid` ·
`FaqAccordion` · `MapPlaceholder` · `NewsletterForm`

### Shared motion — `components/motion/`
`Reveal` · `Stagger` / `StaggerItem` / `StaggerScaleItem` · `TextReveal` ·
`Parallax` · `LuxeImage` · `PageTransition` · `ScrollProgress` · `AnimatedNumber` ·
`variants.ts`

### Shared auth — `components/auth/`
`AuthShell` · `AuthBackdrop` · `AuthField` · `SocialPlaceholders`

### Shared libraries — `lib/`
`theme.ts` (tokens) · `format.ts` (money/date/nights) · `imageUrl.ts` (Cloudinary)
· `amenityIcons.tsx` · `api.ts` · `userAuth.ts`

### Reusable **from their current paths** (deliberately not relocated)
`modules/hotel/components/home/`: `Hero` · `Testimonials` · `GalleryPreview` ·
`WhyChooseUs`. Generic enough to reuse; moving them would have caused import churn
across every page for no functional gain.

### Deliberately **not** built
Modal · Toast · Select · Textarea · Feature Card · Breadcrumb bar. There is no
consumer yet, and shipping untested components with no call site is worse than not
having them. **Extract each when a second vertical actually needs it** — the same
rule that produced the six above.

### Hotel-specific — do **not** move to shared
`RoomCard` · `RoomSearch` · `RoomImageGallery` · `RoomAvailabilityCheck` ·
`BookingForm` · `InvoiceActions` · `BookingSuccessMark` · `CancelBookingButton` ·
`ReviewForm` · `ReviewsList` · `ContactForm`

---

## 22. Do's and Don'ts

### Do
- ✅ Use `.container-luxe` and `.section` for every page and section
- ✅ Use the semantic type classes (`.section-title`, `.lead`, `.body-muted`)
- ✅ Use `components/ui/*`, `components/motion/*`, `lib/format.ts`
- ✅ Route every image through `cldImage()`
- ✅ Animate only `opacity` and `transform`
- ✅ Honour `prefers-reduced-motion`
- ✅ Keep text at `warm-400` or darker
- ✅ Add `loading.tsx` with skeletons for data-backed routes
- ✅ Give every page `generateMetadata`, a canonical URL, and JSON-LD
- ✅ Use `strokeWidth={1.5}` on Lucide icons
- ✅ Alternate section backgrounds and heading alignment

### Don't
- ❌ **Don't hardcode hex values, font stacks, or durations** — use tokens
- ❌ **Don't use `layoutId`** — it pulls in Framer's layout-projection bundle (§11 rule 6)
- ❌ **Don't `@apply` a `.btn-*` class** — `@apply` drops pseudo-elements, so the sheen vanishes
- ❌ **Don't `@apply` arbitrary opacity like `border-ink/12`** — it fails the build; use `border-ink/[0.12]`
- ❌ **Don't `@apply group`** — impossible; put `group` in the markup
- ❌ Don't use Tailwind's default `shadow-md`/`shadow-lg`
- ❌ Don't add a second icon library, animation library, or carousel library
- ❌ Don't use text below 12px, or 12px for anything but wide-tracked uppercase labels
- ❌ Don't uppercase navigation or running text
- ❌ Don't emit three links per card
- ❌ Don't mount an entire image carousel at once
- ❌ Don't centre every heading
- ❌ Don't stack two CTA bands
- ❌ Don't let the footer grow past 280px
- ❌ Don't fake a backend, invent content, or show a figure that could contradict a charge

### Build hygiene
- ❌ **Never run `next build` while `npm run dev:frontend` is running.** Both write to
  `frontend/.next`; the dev server then dies with `Cannot find module './###.js'`.
  Use `npx tsc --noEmit` to verify while dev is up.

---

## 23. Future Module Guidelines — Restaurant & Marriage Hall

Both must reuse this system. The visual language is shared; **the business flow is not.**

### Critical behavioural differences (`RULES.md` §2)
| Vertical | Booking flow |
|---|---|
| **Hotel** | Instant — real-time availability, confirms on payment |
| **Marriage Hall** | **Enquiry → admin approval → payment.** Never instant/self-serve |
| **Restaurant** | Table reservation instant; **online food ordering is Phase 2** — UI placeholder only, no transactional backend |

A Hall booking UI must **not** copy `BookingForm`'s instant-confirm flow. Same
buttons, same cards, same motion — different state machine.

### Reuse checklist
- [ ] `.container-luxe` and `.section` — no bespoke container widths
- [ ] `PageHeader` for every sub-page header (it also emits breadcrumb JSON-LD)
- [ ] `components/ui/*` — `Lightbox`, `Alert`, `EmptyState`, `Pagination`,
      `StatusBadge`, `Monogram`. Writing a second copy of any of these is a bug
- [ ] `components/motion/*` — no second animation library
- [ ] `lib/format.ts` for all money and date output — never inline `toLocaleString`
- [ ] `cldImage()` for every image
- [ ] `.btn-*`, `.card-luxe`, `.field-line` — no new button or input styles
- [ ] Extend `lib/amenityIcons.tsx` rather than writing a second icon map
- [ ] Reuse the backend `content/` module for reviews/gallery/FAQs/offers
      (`PROJECT_DOCUMENTATION.md` §5) — it is already polymorphic
      (`reviewableType` / `applicableTo`), not hotel-specific
- [ ] `loading.tsx` + `Skeleton*` for every data-backed route
- [ ] Text at `warm-400` or darker; nothing below 12px
- [ ] `strokeWidth={1.5}` icons from Lucide only
- [ ] Add nav entries to `Header`'s `NAV_LINKS`; revisit IA past ~10 links
- [ ] Footer stays within its 220–280px budget

### If you need something that doesn't exist
1. Check whether a token or class already covers it.
2. If genuinely new, **add it to the tokens** (`tailwind.config.js` **and**
   `lib/theme.ts`) or to `globals.css` — so every vertical gets it.
3. Never create a parallel palette, a second button family, or a per-vertical
   animation approach.
4. Update this document.

---

## Known gaps (carried forward)

| Gap | Detail |
|---|---|
| **`LazyMotion` unfinished** | Framer ships its full feature set (~40–50KB gzip) on nearly every route. Converting `motion` → `m` with `LazyMotion features={domAnimation}` saves ~13KB/page. The blocker (`layoutId`) is already removed — hence the rule never to reintroduce it |
| **No browser verification** | Phase 3.8/3.9 verified by `next build`, `tsc --noEmit`, and a before/after prerendered-HTML diff. No page opened in a browser; no Lighthouse or screen-reader audit |
| **`text-[11px]` in use** | Below the documented 12px floor. Fixing it is a visual change, deferred |
| **GST needs backend** | `booking.service.ts` computes no tax. The invoice tax row stays hidden until the API supplies `taxAmount`/`taxLabel`/`subtotal`, with the rate admin-configurable (`AI_INSTRUCTIONS.md` §15 forbids hardcoding it) |
| **Images not on Cloudinary** | See §17 — transforms are inert on current Hotel data |
| **Token duplication** | `tailwind.config.js` and `lib/theme.ts` mirror by hand |

---

*Cross-referenced from `CLAUDE.md` and `docs/PROJECT_DOCUMENTATION.md`.
Update this file whenever a token, shared component, or rule changes
(`AI_INSTRUCTIONS.md` §4).*
