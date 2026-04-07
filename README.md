# AutoGlass Pod System

Complete autoglass shop management & POS system with pod (mobile unit) dispatch, built with features inspired by Omega and Mainstreet GlasAve.

## Features

### Core Operations
- **Work Order Management** - Full lifecycle from quote to payment (Omega-style status flow)
- **Customer Management** - CRM with history, fleet accounts, multiple vehicles
- **Vehicle Management** - VIN lookup, year/make/model, NAGS vehicle ID
- **Scheduling & Dispatch** - Calendar view, pod assignment, time slot management
- **Pod Management** - Mobile unit tracking, technician assignment, GPS location, daily routes

### Point of Sale (POS)
- **Register Sessions** - Open/close with cash drawer tracking
- **Payment Processing** - Cash, credit/debit card, check, insurance direct/COD, mobile pay
- **Split Payments** - Multiple payment methods on single invoice
- **Cash Drawer** - Drops, paid-in, paid-out with full audit trail
- **Receipts** - Auto-generated receipt numbers
- **Void & Refund** - Full payment reversal support
- **Session Summary** - End-of-day reconciliation

### Inventory (4 Shop Locations)
- **NAGS Parts Catalog** - Full aftermarket glass database with part numbers
- **Multi-Location Tracking** - Stock levels across all 4 shops
- **Vehicle Glass Lookup** - Search by year/make/model/position
- **Low Stock Alerts** - Automatic reorder point notifications
- **Inter-Shop Transfers** - Request, ship, receive between locations
- **Purchase Orders** - Create POs, receive inventory
- **Pod Inventory** - Track parts loaded on each mobile unit
- **Bin Locations** - Aisle/rack/shelf tracking

### Insurance & Claims
- **Claim Management** - Track claims by insurance company
- **EDI Reference** - 837/835 transaction structure (production EDI via Omega/Mainstreet license)
- **Deductible Tracking** - Insurance pays vs. customer pays calculation
- **Insurance Company Database** - Pre-loaded with major carriers

### Financial
- **Invoicing** - Auto-generate from work orders with line items
- **Pricing Engine** - NAGS markup, labor rates, molding, kits, calibration
- **Quotes** - Create and convert to work orders
- **Reports** - Revenue, tech performance, inventory value, jobs by type, insurance summary, POS daily

### ADAS Calibration
- **Calibration Tracking** - Static, dynamic, or both
- **Calibration Pricing** - Separate line item on work orders

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Auth**: JWT with refresh tokens
- **State**: Zustand
- **Validation**: Zod

## Project Structure

```
├── server/                 # Express API
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema (30+ models)
│   │   └── seed.ts         # Seed data for 4 shops
│   └── src/
│       ├── routes/          # 15 route modules
│       ├── middleware/       # Auth, validation, error handling
│       └── utils/           # Pricing engine, generators
├── client/                 # React SPA
│   └── src/
│       ├── pages/           # 20+ pages
│       ├── components/      # Shared UI components
│       ├── services/        # API client layer
│       └── store/           # Zustand auth store
└── shared/                 # Shared types & constants
```

## Setup (Easy - SQLite, no database install needed!)

Just need Node.js 18+ installed. No PostgreSQL or other database required.

```bash
# 1. Install dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..

# 2. Set up database (creates a local SQLite file automatically)
cd server
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 3. Start the app
npm run dev
```

Then open http://localhost:5173 in your browser.

## Default Login
- Email: `admin@autoglass.com`
- Password: `password123`

## 4 Shop Locations
1. **SHOP1** - AutoGlass Pod Downtown (Dallas)
2. **SHOP2** - AutoGlass Pod North (Plano)
3. **SHOP3** - AutoGlass Pod East (Mesquite)
4. **SHOP4** - AutoGlass Pod South (Cedar Hill)
