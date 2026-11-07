# 💈 Buraclipz — Barbershop Booking & Management System

> **Own your style, embrace your power.** A modern, mobile-first appointment booking platform and staff management system built for **Buraclipz Barbershop**

[![Next.js](https://img.shields.io/badge/Next.js-15.5.28-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-6E9F18?style=flat&logo=vitest)](https://vitest.dev/)

---

## 🚀 Key Features

### 👤 Customer Experience
- **Interactive Booking Flow:** Step-by-step service picker, dynamic date and time-slot selector, and customer confirmation.
- **Strict Double-Booking Protection:** Guaranteed single-occupancy slots backed by `SERIALIZABLE` database isolation and mutex locking.
- **Payment Flexibility:** Pay at shop with Cash, Telebirr, or CBE Birr with optional receipt screenshot upload.
- **Responsive Navigation & Footer:** Full-width desktop footer with shop hours and mobile accordions with native Google Maps embed.

### 🇪🇹 Ethiopian Local Context
- **Addis Ababa Single Clock:** All availability logic operates in East Africa Time (`Africa/Addis_Ababa`, UTC+3).
- **Ethiopian Birr (ETB):** Standardized currency formatting across public pages and admin ledger.
- **Ethiopian Phone Validation:** Enforces correct Ethiopian mobile formats (`+251 9...` and `+251 7...`).
- **Dual Calendar System:** Standard ISO Gregorian records alongside automatic companion Ethiopian Calendar dates (e.g. `Tikimt 18, 2019 E.C.`).

### 🛡️ Admin Dashboard & Operations
- **Protected Staff Portal:** Signed-cookie session authentication (`/admin/login`) with automatic route guards.
- **Live Business Dashboard:** Real-time metrics for today's total appointments, active bookings, completed cuts, and revenue.
- **Walk-in Customer Creation:** Quickly record walk-in appointments and assign services on the fly.
- **Master Schedule Timeline:** Interactive 2D daily time grid (08:00 – 21:00) and 7-day weekly overview without hardcoded staff silos.
- **Persistent Services Management:** Add, edit, price, and hide/show haircut services with instant disk and database sync.
- **Custom Alert Dialog:** Responsive, in-app confirmation modal ("No" / "Yes") replacing native browser popups.
---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS |
| **Backend** | Next.js Server Components, Route Handlers, Node.js |
| **Database & ORM** | PostgreSQL (Neon Serverless) + Prisma ORM 6 |
| **Target Deployment** | **Vercel** (Frontend UI) + **Render** (Backend Web Service) + **Neon** (Postgres DB) |
| **Testing** | Vitest (31 deterministic unit and integration tests) |
| **Styling & Fonts** | Custom Design Tokens, Outfit Font (`@google/fonts`) |

---

## 📁 Project Structure

```text
├── .data/                  # Persistent local dev fallback store (services.json, appointments.json)
├── prisma/
│   ├── schema.prisma       # Database schema (Barbers, Services, WorkingHours, Appointments, Customers)
│   └── seed.ts             # Initial shop seed data
├── public/                 # Static assets (logo, icons, uploads)
├── src/
│   ├── app/                # Next.js 15 App Router pages & APIs
│   │   ├── (public)        # Home, booking, contact, location, manage
│   │   ├── admin/          # Admin Dashboard, Schedule, Bookings, Services, Login
│   │   └── api/            # REST API endpoints (availability, bookings, admin, notifications)
│   ├── components/         # Reusable UI widgets (BookingFlow, SiteFooter, SiteHeader)
│   ├── lib/                # Core business logic & services
│   │   ├── availability.ts # Dynamic slot generation & working hour computation
│   │   ├── booking-transaction.ts # Serializable double-booking concurrency lock
│   │   ├── data-store.ts   # Unified storage layer (Neon Prisma + file-backed fallback)
│   │   ├── ethiopian-calendar.ts  # Gregorian to Ethiopian calendar converter
│   │   ├── notifications/  # Email (Resend), Telegram, and SMS dispatchers
│   │   └── phone.ts        # Ethiopian mobile number parser & normalizer
│   └── middleware.ts       # Route guards, admin protection & CORS preflight
├── render.yaml             # Render infrastructure-as-code deployment configuration
├── vercel.json             # Vercel cron configuration for 24h reminders
└── vitest.config.ts        # Test configuration
```

---

## 🚦 Getting Started

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm** or **pnpm**
- **PostgreSQL Database** (Neon free serverless instance recommended)

### 2. Installation
```powershell
# Clone the repository
git clone https://github.com/Firaoll77/Buraclipz.git
cd Buraclipz

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the example environment file and fill in your credentials:
```powershell
cp .env.example .env
```

Key variables in `.env`:
```env
# Neon PostgreSQL Connection Strings
DATABASE_URL="postgresql://[user]:[password]@[host]-pooler.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://[user]:[password]@[host].neon.tech/neondb?sslmode=require"

# Shop Local Timezone
TZ="Africa/Addis_Ababa"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Admin Dashboard Access
ADMIN_PASSWORD="YourStrongAdminPassword"
ADMIN_SESSION_SECRET="your-32-character-random-session-secret"

# Optional: Notifications
RESEND_API_KEY="re_..."
TELEGRAM_BOT_TOKEN="123456:ABC..."
TELEGRAM_SHOP_CHAT_ID="-100..."
```

### 4. Database Setup
Push the schema to your Neon database and populate default shop services:
```powershell
# Push Prisma schema
npx prisma db push

# Seed initial barbers, services, and working hours
npx tsx prisma/seed.ts
```

### 5. Run Development Server
```powershell
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser. Access the Admin Panel at **[http://localhost:3000/admin](http://localhost:3000/admin)**.

---

## 🧪 Running Automated Tests

The application includes an extensive Vitest test suite covering:
- Double-booking prevention under simultaneous concurrent race conditions
- Real-time availability and slot calculation across shop hours
- Ethiopian phone number normalization and validation
- Resend email, Telegram bot alerts, and reminder dispatching
- Secure token cancellation with the 2-hour cutoff rule

Run the full test suite:
```powershell
npm test
```

-
