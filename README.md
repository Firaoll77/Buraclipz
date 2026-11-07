# Arada Men's Grooming - Barbershop Booking System (Addis Ababa)

A lightweight, mobile-first appointment booking web application built from scratch for a small men's barbershop in Addis Ababa, Ethiopia.

## Stack
- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS adhering strictly to the design system
- **Database & ORM**: PostgreSQL (Supabase / Neon) + Prisma ORM
- **Testing**: Vitest for fast, deterministic unit and logic tests
- **Timezone**: `Africa/Addis_Ababa` (UTC+3)

## Design System Specifications
- **Background**: `#727272`
- **Text**: `#000000`
- **Cards & Borders**: `#3A3A3A`
- **Primary CTA / Accent**: `#ff9800`
- **Secondary Accent**: `#fdd835`
- **Grid**: 10px spacing system (multiples of 10)
- **Border Radius**: 50px pill buttons, 20px card radius, no sharp corners
- **Touch Targets**: Minimum 44x44px for all interactive elements
- **Breakpoints**: `<640px` single column, `640px-1024px` two columns, `>1440px` centered max-width

## Local Context (Addis Ababa, Ethiopia)
- **Single shop clock**: All appointments operate in Addis Ababa local time (`Africa/Addis_Ababa`).
- **Currency**: Ethiopian Birr formatted as `500 ETB`.
- **Phone Validation**: Validates Ethiopian mobile format (`+251 9XX XXX XXX` and `+251 7XX XXX XXX`).
- **Calendar**: Dates stored in standard ISO Gregorian format, with automatic companion display in the Ethiopian Calendar (e.g. `Tikimt 18, 2019 E.C.`).
- **Payment**: Pay at the shop in v1 (Cash / Mobile Transfer).

## Quick Start

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your PostgreSQL database URL (Neon / Supabase):
```bash
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
DIRECT_URL="postgresql://user:password@host:port/database?schema=public"
```

### 2. Push Schema & Seed Database
```bash
npx prisma db push
npm run prisma:seed
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Test Suite
```bash
npm test
```

