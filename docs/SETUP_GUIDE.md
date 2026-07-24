# SETUP_GUIDE.md — 7 Vachan Local Project Initialization (MongoDB version)

**Status:** Setup-only. No business modules built. This gets a runnable skeleton locally — empty pages, empty API, DB connection ready.

---

## 0. Tech Stack (updated)
- **Frontend:** Next.js 14 (React) + TypeScript + TailwindCSS
- **Admin Panel:** Next.js 14 (separate app) + TypeScript + TailwindCSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** **MongoDB** + Mongoose ODM  *(changed from PostgreSQL/Prisma)*
- **Payments:** Razorpay SDK
- **Monorepo tool:** npm Workspaces

---

## 1. Prerequisites
- Node.js LTS (v20.x) — https://nodejs.org
- npm (comes with Node)
- **MongoDB** (v7+) — local install, Docker, or MongoDB Atlas (cloud, free tier works for dev)
- Git

Verify:
```bash
node -v
npm -v
mongod --version   # only if running MongoDB locally
git --version
```

> If using **MongoDB Atlas** instead of local MongoDB, skip local install — you'll just need a connection string (see step 6).

---

## 2. Project Initialization Commands

```bash
mkdir 7vachan && cd 7vachan
git init
npm init -y
bash deployment/scripts/create-folder-structure.sh

cd frontend && npm init -y && cd ..
cd backend && npm init -y && cd ..
cd admin-panel && npm init -y && cd ..
```
> Replace the auto-generated `package.json` files with the provided ones (correct dependencies/scripts already set).

---

## 3. Package Installation Commands

### Root
```bash
npm install -D concurrently
```

### Frontend
```bash
cd frontend
npm install next react react-dom axios react-hook-form zod @hookform/resolvers react-datepicker swiper next-seo tailwindcss
npm install -D typescript @types/react @types/node autoprefixer postcss eslint eslint-config-next prettier jest
cd ..
```

### Admin Panel
```bash
cd admin-panel
npm install next react react-dom axios react-hook-form zod @hookform/resolvers recharts react-table tailwindcss
npm install -D typescript @types/react @types/node autoprefixer postcss eslint eslint-config-next prettier jest
cd ..
```

### Backend (MongoDB stack)
```bash
cd backend
npm install express cors helmet dotenv mongoose jsonwebtoken bcryptjs express-rate-limit zod razorpay nodemailer winston multer
npm install -D typescript ts-node nodemon @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/multer eslint prettier jest @types/jest ts-jest
cd ..
```

> Note: `@prisma/client` and `prisma` are **removed**. `mongoose` replaces them as the ODM.

---

## 4. Configuration Files (already provided)
| File | Location | Purpose |
|---|---|---|
| `.gitignore` | root | Excludes node_modules, .env, build output |
| `package.json` | root, frontend/, backend/, admin-panel/ | Dependencies + scripts |
| `tsconfig.json` | frontend/, backend/, admin-panel/ | TypeScript config |
| `tailwind.config.js` / `postcss.config.js` | frontend/, admin-panel/ | Tailwind setup |
| `src/config/db.ts` | backend/ | Mongoose connection setup (stub) |
| `src/server.ts` | backend/ | Express entry point with health-check route |
| `.env.example` | frontend/, backend/, admin-panel/ | Required env var templates |

---

## 5. Environment Variables Setup

```bash
cp frontend/.env.example frontend/.env.local
cp admin-panel/.env.example admin-panel/.env.local
cp backend/.env.example backend/.env
```
Fill in real values — most importantly `MONGODB_URI` in `backend/.env`. Never commit these files.

---

## 6. Database Setup (MongoDB)

### Option A — Local MongoDB
```bash
# Start MongoDB locally (if installed as a service, it may already be running)
mongod --dbpath /your/data/path

# In backend/.env:
MONGODB_URI=mongodb://localhost:27017/vachan_dev
```

### Option B — MongoDB Atlas (cloud, recommended even for dev)
1. Create a free cluster at https://www.mongodb.com/atlas
2. Create a database user + whitelist your IP (or `0.0.0.0/0` for dev only)
3. Copy the connection string into `backend/.env`:
```bash
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.mongodb.net/vachan_dev?retryWrites=true&w=majority
```

No migration step is needed for MongoDB (schema-less at the DB level) — collections will be created automatically once models are defined and first written to, in the module-building phase.

---

## 7. Running the Project Locally

### All together (from root)
```bash
npm run dev:all
```
- Frontend → http://localhost:3000
- Backend → http://localhost:5000
- Admin Panel → http://localhost:3001

### Individually
```bash
npm run dev:frontend
npm run dev:backend
npm run dev:admin
```

---

## 8. Project Scripts Reference
| Script | Purpose |
|---|---|
| `npm run dev:frontend` | Run public website only |
| `npm run dev:backend` | Run API server only |
| `npm run dev:admin` | Run admin panel only |
| `npm run dev:all` | Run all three concurrently |
| `npm run build:all` | Production build of all three |
| `npm run db:seed` | Run seed script (backend/../database/seeders) once seeders are written |

---

## 9. Verification Checklist
- [ ] `http://localhost:3000` loads blank Next.js frontend
- [ ] `http://localhost:3001` loads blank Next.js admin panel
- [ ] `http://localhost:5000/api/v1/health` returns `{"status":"ok","service":"7vachan-backend"}`
- [ ] Backend console shows `✅ MongoDB connected successfully`
- [ ] `.env` files exist locally and are **not** tracked by git

---

## 10. What Changed From the PostgreSQL/Prisma Version
- Removed: `@prisma/client`, `prisma`, `database/schema.prisma`, all `prisma:*` scripts
- Added: `mongoose`, `backend/src/config/db.ts` (connection stub), `database/models/` folder (empty, models added module-by-module)
- `.env` — `DATABASE_URL` replaced with `MONGODB_URI`
- `DATABASE_SCHEMA.md` (separate doc) will need its table definitions reinterpreted as Mongoose schemas/collections when each module is built — relationships (foreign keys) become references (`ObjectId` + `ref`) or embedded documents depending on the module.

## 11. What Was NOT Done (still, by design)
- No UI components/pages built
- No API routes/controllers beyond the health-check
- No Mongoose models/schemas defined yet
- No authentication logic implemented
- No payment integration logic implemented
