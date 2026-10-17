# Dental Lab Management

A web application for managing a dental laboratory: raw materials and stock, purchases, doctors and sales, work orders with an interactive tooth chart, and a dashboard with monthly charts and low-stock alerts. The interface is available in **Arabic (RTL)** and **English (LTR)**.

- **Repository:** https://github.com/Mai-AZ/dental-lab-management
- **Live site (frontend):** _add the published URL here_
- **Live backend (API):** _add the deployed API URL here once it is published_

> Arabic summary at the bottom of this file / الملخص بالعربي بآخر الملف.

---

## Features

| Area | What it does |
| --- | --- |
| **Materials** | CRUD for materials with unit and alert threshold. Quantity and price are never edited by hand; they are derived from purchases. |
| **Purchases** | Recording a purchase increases stock and updates the material's average unit price. Deleting a purchase reverses it. |
| **Sales & Doctors** | Register doctors and record sales (service type, price, cost). |
| **Work orders** | Per-doctor work records with an interactive tooth chart (UR/UL/LR/LL quadrants), work type, shade, received and delivery dates. |
| **Dashboard** | Totals (sales, purchases, net profit), last-6-months chart, low-stock alerts, latest sales and purchases. |
| **Excel export** | Export materials, purchases and sales to `.xlsx`. |
| **Audit log** | Deletions of purchases, materials and work orders are recorded (before/after snapshot) in an `AuditLog` table, inside the same transaction. |
| **Arabic / English** | Language toggle; direction (RTL/LTR), dates and numbers follow the selected language. The choice is remembered in `localStorage`. |

## Tech stack

**Backend:** Node.js, Express 5, Prisma 6, PostgreSQL (Neon), `express-session` + `connect-pg-simple`, `bcrypt`, `helmet`, `express-rate-limit`, `cors`, `exceljs`.

**Frontend:** React 19, Vite, React Router 7, Tailwind CSS 4, Recharts, Axios.

## Project structure

```
.
├── .github/workflows/deploy.yml   # builds the frontend and deploys to GitHub Pages
├── Backend/
│   ├── server.js                  # production entry point (starts the Express app; used by Passenger/cPanel)
│   ├── prisma/                    # schema.prisma + migrations
│   └── src/
│       ├── app.js                 # Express app, session, CORS, CSRF check, helmet
│       ├── createAdmin.js         # creates the first admin user
│       ├── middleware/            # requireAuth, central errorHandler
│       ├── routes/                # auth, materials, purchases, sales, doctors, workOrders, dashboard, export
│       └── utils/                 # AppError, asyncHandler, audit, pagination
└── frontend/
    └── src/
        ├── api/axiosClient.js
        ├── components/            # Navbar, ProtectedRoute, ToothChart, ExportButton, LanguageToggle, Pagination
        ├── i18n/                  # translations.js (ar/en) + LanguageContext
        └── pages/                 # Login, Dashboard, Materials, Purchases, Sales, WorkOrders, NotFound
```

## Run locally

**Requirements:** a recent Node.js LTS (20.19+ or 22+), npm, and a PostgreSQL database (a free [Neon](https://neon.tech) project works well).

### 1) Backend

```bash
cd Backend
npm install
cp .env.example .env        # then fill in the values (see table below)
npx prisma migrate deploy   # applies the existing migrations
npm run create-admin        # creates the first admin user
npm run dev                 # http://localhost:5000  (health check: /api/health)
```

### 2) Frontend (in a second terminal)

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm run dev                 # http://localhost:5173
```

> Keep the frontend on port **5173**. The backend only accepts requests from the origin set in `FRONTEND_URL` (CORS and CSRF check), so if Vite starts on another port (e.g. 5174 because 5173 is busy), requests will be rejected. Stop the other Vite process and start again.

### Environment variables

**Backend (`Backend/.env`)**

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. With Neon, use the **pooled** connection (host contains `-pooler`) and `?sslmode=require`. |
| `SESSION_SECRET` | Long random string used to sign session cookies. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `FRONTEND_URL` | Exact origin of the frontend, no path and no trailing slash. Local: `http://localhost:5173`. Production: the public URL of the site, e.g. `https://example.com`. The server refuses to start in production if it is missing. |
| `NODE_ENV` | `development` locally, `production` when deployed. |
| `PORT` | Port to listen on (default `5000`). |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Used only by `npm run create-admin`. The password must be at least 8 characters. |

**Frontend (`frontend/.env`)**

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the API, e.g. `http://localhost:5000/api`. It is read **at build time**. |
| `VITE_BASE` | Optional. Public base path of the built site. Defaults to `/` in development and `/dental-lab-management/` for production builds (GitHub Pages). Use `VITE_BASE=/` when serving from a domain root. Also read at build time. |

### Demo login

For evaluation: username `admin`, password `12345678`.

> This account is for reviewing the project only. Change the password (or create a new admin with `npm run create-admin`) before using the system with real data.

Login is rate limited to 10 attempts per 15 minutes per IP. If you exceed it, wait 15 minutes and try again.

## Security notes

- Passwords are hashed with **bcrypt**; passwords longer than 72 bytes are rejected up front (bcrypt's limit).
- Authentication uses **server-side sessions** stored in PostgreSQL, with `httpOnly` cookies.
- **CSRF protection:** state-changing requests (POST/PUT/PATCH/DELETE) are rejected unless `Origin`/`Referer` matches `FRONTEND_URL`.
- **CORS** is restricted to the configured frontend origin and `helmet` sets secure headers.
- **Rate limiting:** login is limited to 10 attempts per 15 minutes per IP (brute-force protection), and the whole API to 300 requests per 15 minutes per IP.
- Input is validated on the server (types, ranges, formats); database access goes through Prisma (parameterized queries).
- Stock-changing and delete operations run inside **database transactions**, and deletions are written to the audit log.
- A central error handler returns consistent JSON errors without leaking stack traces.
- Secrets live only in environment variables; `.env` files are git-ignored and only `.env.example` files are committed.

## Deployment

The backend needs any Node.js host plus a PostgreSQL database. The frontend is a static build and can live anywhere.

### Option A: cPanel shared hosting (frontend and API on the same site)

Recommended, because the frontend (`example.com`) and the API (`api.example.com`) are then **same-site**, so the session cookie also works in Safari.

1. **Domains:** point the domain to the hosting, then in cPanel create the main domain (document root `public_html`) and an `api.` subdomain with its own folder. Run **AutoSSL** for both.
2. **Backend:** upload the `Backend` folder (for example `git archive --format=zip -o backend.zip HEAD:Backend`, then upload and extract). In **Setup Node.js App** create an app with Application URL `api.example.com` and **Startup file `server.js`**.
3. **Install dependencies from the terminal** (do not use the "Run NPM Install" button, its `postinstall` fails on the symlinked `node_modules`):
   ```bash
   source ~/nodevenv/<app-folder>/20/bin/activate && cd ~/<app-folder>
   npm install --ignore-scripts --no-audit --no-fund
   npx prisma generate
   ```
4. **Environment variables:** `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `FRONTEND_URL=https://example.com`. Keep them in **one place only**: variables defined in cPanel take precedence over a `.env` file. Restart the app and check `https://api.example.com/api/health` returns `{"status":"ok"}`.
5. **Frontend build** (read at build time):
   ```bash
   cd frontend
   VITE_BASE=/ VITE_API_URL=https://api.example.com/api npm run build
   ```
   Upload the **contents** of `dist/` to `public_html`, together with an `.htaccess` for client-side routing:
   ```apache
   RewriteEngine On
   RewriteBase /
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```
   (On Git Bash for Windows, prefix the build command with `MSYS_NO_PATHCONV=1` so `/` is not rewritten into a path.)
6. Migrations are applied once with `npx prisma migrate deploy` against the production database, then `npm run create-admin`.

### Option B: frontend on GitHub Pages + API on any Node.js host

**Frontend** (automatic via `.github/workflows/deploy.yml` on every push to `main`):

1. Repository **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add `VITE_API_URL` with the public API URL, e.g. `https://<your-backend-host>/api`.
3. Push to `main` (or run the workflow manually). Whenever `VITE_API_URL` changes, run the workflow again because the value is baked in at build time.

**Backend:**

- Root directory `Backend`, install command `npm install`, start command `npm start` (runs `server.js`).
- Set `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production` and `FRONTEND_URL=https://mai-az.github.io`.
- Run `npx prisma migrate deploy` once, then `npm run create-admin`.
- Verify with `GET /api/health`, which should return `{"status":"ok"}`.

> With Option B the frontend and the API live on different sites, so the session cookie is cross-site (`SameSite=None; Secure`). It works in Chrome; some browsers (e.g. Safari) block third-party cookies by default and may fail to keep the session. Option A avoids this.

---

## ملخص بالعربي

نظام لإدارة مخبر أسنان: المواد والمخزون، المشتريات، الأطباء والمبيعات، سجل الأعمال مع مخطط أسنان تفاعلي، ولوحة تحكم فيها رسم بياني وتنبيهات المخزون. الواجهة بالعربية والإنجليزية مع تبديل تلقائي للاتجاه.

**التشغيل محلياً (تبويبين منفصلين):**

1. الباك: من مجلد `Backend` نفّذ `npm install`، انسخ `.env.example` إلى `.env` وعبّئ القيم، ثم `npx prisma migrate deploy` و`npm run create-admin` و`npm run dev` (المنفذ 5000).
2. الفرونت: من مجلد `frontend` نفّذ `npm install` ثم `npm run dev` (المنفذ 5173، لازم يبقى 5173 لأن الباك بيقبل هالمصدر فقط).

**النشر:** الباك على أي استضافة Node.js (ملف التشغيل `Backend/server.js`) مع قاعدة PostgreSQL، والفرونت ملفات ثابتة (`npm run build`). الأفضل وضع الفرونت والـ API تحت نفس الدومين (مثلاً `example.com` و`api.example.com`) حتى تعمل الكوكي بكل المتصفحات. التفاصيل بقسم Deployment أعلاه.

**بيانات الدخول للتجربة:** `admin` / `12345678` (للتقييم فقط، غيّرها قبل الاستخدام الفعلي).

**الأمان:** تشفير كلمات السر بـ bcrypt، جلسات على السيرفر، حماية CSRF بفحص Origin، CORS محدود، helmet، تحديد عدد محاولات الدخول، تحقق من المدخلات، عمليات داخل transactions، وسجل تدقيق للحذف.