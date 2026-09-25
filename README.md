# 7 Vachan — Hotel · Restaurant · Marriage Hall Platform

A full-stack booking platform for **7 Vachan**, a single property that runs three
businesses under one roof:

| Vertical | What a customer can do | How it's confirmed |
|---|---|---|
| 🏨 **Hotel** | Browse rooms, check live availability, book one or more room types, pay an advance online, cancel | **Instant** — confirmed after Razorpay payment is verified |
| 🍽️ **Restaurant** | Browse the menu and dining areas, reserve a table | **Instant** reservation (no payment) |
| 💍 **Marriage Hall** | Explore packages, décor, catering, check date availability, send an enquiry | **Approval-first** — an admin reviews the enquiry before the date is held |

Staff manage all three from one **admin panel**, with role-based access so each
manager sees only their own business.

---

## Table of contents
1. [Architecture](#1-architecture)
2. [Tech stack](#2-tech-stack)
3. [Repository structure](#3-repository-structure)
4. [How a request flows](#4-how-a-request-flows)
5. [Key flows](#5-key-flows)
6. [Authentication & roles](#6-authentication--roles)
7. [API overview](#7-api-overview)
8. [Getting started](#8-getting-started)
9. [Scripts](#9-scripts)
10. [Documentation](#10-documentation)
11. [Known limitations & roadmap](#11-known-limitations--roadmap)

---

## 1. Architecture

Three apps share one MongoDB database. The two Next.js apps **never touch the
database** — they only talk to the backend's REST API under `/api/v1`.

```
┌──────────────────────┐     ┌──────────────────────┐
│  Public website      │     │  Admin panel         │
│  Next.js 14 · :3100  │     │  Next.js 14 · :3101  │
│  (customers, guests) │     │  (staff, RBAC)       │
└──────────┬───────────┘     └──────────┬───────────┘
           │   HTTPS / JSON  (REST /api/v1)   │
           └──────────────┬───────────────────┘
                          ▼
            ┌──────────────────────────┐        ┌───────────────┐
            │  Backend API             │───────▶│  Razorpay     │ payments & refunds
            │  Express + TypeScript    │───────▶│  Cloudinary   │ image storage
            │  :5100                   │───────▶│  SMTP         │ emails
            └────────────┬─────────────┘        └───────────────┘
                         │ Mongoose
                         ▼
                 ┌───────────────┐
                 │   MongoDB     │
                 └───────────────┘
```

**Design principles**
- **Vertical-sliced backend.** Each business is its own module (`hotel`, `restaurant`, `hall`), with shared modules for `auth`, `content`, `settings`, `audit` and `console`.
- **Strict layering.** Every request goes `routes → controller → service → model`.
- **Multi-tenant ready.** Models carry a `branchId`, and nothing hardcodes a single property, even though only one exists today.
- **Guest checkout.** No booking flow ever forces a customer to log in.

---

## 2. Tech stack

| Layer | Technology | Used for |
|---|---|---|
| Public site | **Next.js 14** (App Router), **React 18**, **TypeScript** | Server-rendered, SEO-friendly pages |
| | **Tailwind CSS**, **framer-motion**, **Swiper**, **lucide-react** | Design system, animation, carousels, icons |
| Admin panel | **Next.js 14**, **React 18**, **Tailwind CSS**, **recharts** | Dashboard, management screens, charts |
| Backend | **Node.js**, **Express 4**, **TypeScript** | REST API |
| | **Zod** | Request validation |
| | **jsonwebtoken**, **bcryptjs** | JWT auth, password hashing |
| | **helmet**, **cors**, **express-rate-limit** | HTTP hardening, rate limiting on public forms |
| | **multer** (memory storage) | Image uploads |
| | **exceljs**, **pdfkit** | Excel / PDF exports |
| Database | **MongoDB** + **Mongoose 8** | Data storage & schemas |
| Integrations | **Razorpay** | Hotel advance payments & refunds |
| | **Cloudinary** | Image hosting & optimisation |
| | **Nodemailer** (SMTP) | Confirmation, verification & reset emails |
| Tooling | npm workspaces, nodemon, ts-node, ESLint, Prettier | Monorepo & dev workflow |

> Email, Cloudinary and Razorpay **degrade gracefully** when their keys are not set
> (emails are logged to the console), so the project runs locally without them.

---

## 3. Repository structure

```
7vachan/
├── frontend/                 # Public website (Next.js)
│   └── src/
│       ├── app/              # Routes: /hotel, /restaurant, /marriage-hall, /my-bookings, …
│       ├── components/       # Shared UI, SEO schema (JSON-LD), sections, motion
│       ├── modules/          # Feature components (e.g. hotel BookingForm)
│       └── lib/              # api.ts (fetch wrapper), hotel/restaurant/hall/settings data, userAuth
│
├── admin-panel/              # Staff console (Next.js)
│   └── src/
│       ├── app/              # Routes: /bookings, /reservations, /enquiries, /users, /settings, …
│       ├── components/       # UI primitives, layout shell, content managers
│       └── lib/              # adminApi, session, business context, notifications
│
├── backend/                  # REST API (Express + TypeScript)
│   └── src/
│       ├── server.ts         # App entry: middleware, route mounting, error handler
│       ├── config/           # MongoDB & Cloudinary setup
│       ├── middlewares/      # auth, audit, error, rate limit, upload
│       ├── utils/            # ApiError, JWT, email, Razorpay, Cloudinary helpers
│       └── modules/
│           ├── auth/         # Users, admins, login, JWT, admin-user management
│           ├── hotel/        # Hotels, rooms, availability, bookings
│           ├── restaurant/   # Menu, dining areas, table reservations
│           ├── hall/         # Halls, packages, showcases, enquiries
│           ├── content/      # Shared reviews, gallery, FAQs, offers (all verticals)
│           ├── settings/     # Global platform settings (15 categories)
│           ├── audit/        # Audit log of admin actions
│           └── console/      # Dashboard activity, notifications, search, exports
│
├── database/seeders/         # Super-admin seeder & demo-content seeder
├── deployment/scripts/       # Project scaffolding script
└── docs/                     # Project, API and design-system documentation
```

Each backend module follows the same pattern:

```
<module>.routes.ts      → URL + middleware (auth, role, rate limit)
<module>.controller.ts  → parse & validate request (Zod), call service, send response
<module>.service.ts     → business logic, throws ApiError on failure
<module>.validation.ts  → Zod schemas
models/*.model.ts       → Mongoose schemas
```

---

## 4. How a request flows

Every API call follows the same path. As an example, a hotel guest checks room availability:

```
Browser (frontend/src/app/hotel/rooms/[roomSlug])
   │  fetch  GET /api/v1/hotels/rooms/:roomId/availability?checkIn=…&checkOut=…
   ▼
Express  server.ts  →  helmet · cors · JSON parser
   ▼
hotel.routes.ts          matches the URL (public — no auth needed)
   ▼
hotel.controller.ts      validates the query with Zod → 400 if invalid
   ▼
hotel.service.ts         availability = totalRooms − manually blocked − overlapping bookings
   ▼
Mongoose models          Room · RoomAvailability · HotelBooking
   ▼
MongoDB
   ▼
Response  { "success": true, "data": { "availableCount": 3 } }
```

**Every response uses the same envelope:**

```json
{ "success": true,  "message": "…", "data": { } }
{ "success": false, "message": "…", "errors": [{ "field": "guestEmail", "message": "Invalid email" }] }
```

Services throw `ApiError(status, message)`, and one central `errorHandler`
(registered last in `server.ts`) turns every error into that envelope.

---

## 5. Key flows

### 🏨 Hotel booking & payment
```
Guest picks dates + rooms (can mix categories, e.g. 2 Deluxe + 1 Suite)
   ▼
POST /api/v1/hotel-bookings
   → availability re-checked → booking saved as PENDING (reference 7V-XXXXXXXX)
   → Razorpay order created for the advance (default 20%)
   ▼
Razorpay Checkout opens in the browser → guest pays
   ▼
POST /api/v1/hotel-bookings/verify-payment
   → server recomputes the HMAC-SHA256 signature with the secret key
   → match? booking → CONFIRMED, paymentStatus → PAID, confirmation email sent
   ▼
Confirmation page  /hotel/booking/confirmation/[reference]
```
A booking is **never** confirmed from the browser's word alone. The server's signature check is the only proof of payment.

**Cancellation:** the guest proves ownership with their email (or login). Inside
the free-cancellation window the advance is refunded through Razorpay. If that
refund fails, the booking moves to `refund_pending` for staff to follow up.

### 🍽️ Restaurant reservation
```
Guest picks date, time, party size, dining area
   ▼
POST /api/v1/table-reservations → capacity checked → reservation created instantly
   ▼
Confirmation page  /restaurant/reserve/confirmation/[reference]
```
Online food ordering is planned for Phase 2. The site shows placeholders only.

### 💍 Marriage Hall enquiry
```
Family checks the availability calendar and submits an enquiry
   ▼
POST /api/v1/hall-enquiries → enquiry saved (no date held, no payment)
   ▼
Admin reviews it in the admin panel → contacts the family → sets status
   ▼
Status CONFIRMED → only now is the date held on the calendar
```

### 🛠️ Admin panel
```
Staff login → JWT (admin) → dashboard scoped to the staff member's role
   ├─ Manage properties, rooms, menus, halls, packages
   ├─ Handle bookings / reservations / enquiries
   ├─ Moderate reviews, manage gallery, offers, FAQs
   ├─ Global Settings (branding, contact, integrations — secrets encrypted)
   └─ Audit log, notifications, search, Excel/PDF exports
```

---

## 6. Authentication & roles

There are two separate kinds of account. Each has its own collection, JWT secret and token expiry:

| Actor | Who | How they get an account |
|---|---|---|
| **User** | Customers | Optional signup with email verification. Guests can book without one |
| **Admin** | Staff | Created by a Super Admin. There is **no public admin signup** |

**Admin roles (RBAC, enforced on the server):**

| Role | Access |
|---|---|
| `super_admin` | Everything, including admin users, settings and audit logs |
| `hotel_manager` | Hotel only |
| `restaurant_manager` | Restaurant only |
| `hall_manager` | Marriage Hall only |

```
Request with  Authorization: Bearer <JWT>
   ▼
authenticate("admin")   verify signature + expiry, re-load the account from the DB
   ▼                    (so a deactivated or demoted admin is locked out instantly)
requireRole(...)        e.g. HOTEL_MANAGER_ROLES = ["super_admin", "hotel_manager"]
   ▼
controller → service → database
```

Hiding pages in the admin UI only makes it tidier. The real permission check always happens again on the server.

---

## 7. API overview

Base URL: `http://localhost:5100/api/v1`

| Area | Public | Admin |
|---|---|---|
| Health | `GET /health` | — |
| Auth | `/auth/*` (login, signup, verify email, forgot/reset password) | `/admin/users` (Super Admin) |
| Hotel | `/hotels`, `/hotel-bookings` | `/admin/hotels` |
| Restaurant | `/restaurants`, `/table-reservations` | `/admin/restaurants` |
| Marriage Hall | `/halls`, `/hall-enquiries` | `/admin/halls` |
| Settings | `/settings` | `/admin/settings` (Super Admin) |
| Audit | — | `/admin/audit-logs` |
| Console | — | `/admin/console` (dashboard, notifications, search, exports) |

Full endpoint reference: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).

---

## 8. Getting started

### Prerequisites
- Node.js 18+ and npm
- A MongoDB database (local or MongoDB Atlas)
- *(Optional)* Razorpay, Cloudinary and SMTP credentials

### 1. Install
```bash
git clone https://github.com/arjit203/Hotel-Management-System.git
cd Hotel-Management-System
npm install          # installs all three workspaces
```

### 2. Configure environment
```bash
cp frontend/.env.example    frontend/.env.local
cp admin-panel/.env.example admin-panel/.env.local
```
Create `backend/.env` by hand (there is no example file). Minimum:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
PORT=5100
JWT_SECRET=<long-random-string>
ADMIN_JWT_SECRET=<different-long-random-string>
FRONTEND_URL=http://localhost:3100
ADMIN_PANEL_URL=http://localhost:3101
```
Optional: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SMTP_*`, `EMAIL_FROM`,
`HOTEL_ADVANCE_PAYMENT_PERCENT` (default 20), `CANCELLATION_FREE_WINDOW_HOURS` (default 24).
See [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) for the full list.

> Never commit `.env` files. They are already in `.gitignore`.

### 3. Create the first Super Admin
```bash
cd backend
npx ts-node ../database/seeders/seed-super-admin.ts
```

### 4. Run
```bash
npm run dev:all
```
| App | URL |
|---|---|
| Public website | http://localhost:3100 |
| Admin panel | http://localhost:3101 |
| API health check | http://localhost:5100/api/v1/health |

### 5. *(Optional)* Load demo content
With the backend running:
```bash
cd backend
npx ts-node ../database/seeders/seed-demo-content.ts --email <admin-email> --password <admin-password>
```
This is safe to re-run. It never touches bookings, reservations, enquiries, users or prices.

---

## 9. Scripts

Run from the repository root:

| Command | Does |
|---|---|
| `npm run dev:all` | Starts all three apps together |
| `npm run dev:frontend` | Public site on :3100 |
| `npm run dev:backend` | API on :5100 (auto-restart with nodemon) |
| `npm run dev:admin` | Admin panel on :3101 |
| `npm run build:all` | Builds backend (tsc), then both Next.js apps |

Per workspace: `npm run <build|start|lint|format> --workspace=backend|frontend|admin-panel`.
Backend type-check: `cd backend && npx tsc --noEmit`.

---

## 10. Documentation

| File | Contents |
|---|---|
| [`docs/PROJECT_DOCUMENTATION.md`](docs/PROJECT_DOCUMENTATION.md) | Module-by-module design decisions and known limitations |
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Every endpoint: method, auth, body, responses, errors |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Public-site fonts, colours, type scale, components, motion |
| [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) | Detailed local setup |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | History of changes, newest first |

---

## 11. Known limitations & roadmap

These are known, deliberate gaps in the current version:

- **Concurrent last-room bookings.** The availability check and booking creation don't run in one database transaction, so two simultaneous requests for the last room could both succeed. This is planned for a shared Booking Engine module.
- **Payment confirmation depends on the browser's verify call.** There is no Razorpay webhook yet, so a payment whose verify call never arrives leaves the booking `pending`.
- **Payments exist for Hotel only.** Marriage Hall payment after approval, and restaurant online ordering, are future phases.
- **No automated tests yet.** Changes are verified manually and with TypeScript type-checks.
- **Single property today.** The data model supports several branches, but the site currently shows one.

**Roadmap:** shared Booking Engine (transactions and locking), Razorpay webhooks,
Marriage Hall payments, restaurant online ordering, WhatsApp integration and an
automated test suite.
