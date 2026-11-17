# QuickBasket 🧺

A quick-commerce grocery delivery web app built with **Next.js (App Router)**, **Drizzle ORM**, and **PostgreSQL**. Browse categories, add items to your cart, check out, and track your order on a live status timeline — plus a full admin panel to manage the catalog, coupons, pincodes and order fulfilment.

> This is a functional prototype. The "~10 minute" delivery estimate is illustrative. No live GPS tracking, payment processor, or lending partner is connected. Online payment outcomes remain pending until explicitly set in the development-only simulator.

## Tech stack
- **Next.js 16 (App Router)** — server components for data-heavy pages, client components for interactive UI
- **PostgreSQL + Drizzle ORM** — schema in `src/db/schema.ts`
- **Supabase Auth** — email/password signup and login; QuickBasket keeps an application session cookie and local profile/role row
- **Zod** — request validation on every API route
- **Tailwind CSS** — styling

## Getting started
```bash
cp .env.example .env.local  # fill in Supabase URL, anon key, and database URL
npx drizzle-kit push        # sync schema to Supabase Postgres
npx tsx src/db/seed.ts      # seed a new database only
npm run dev
```

Create accounts from `/register`. If email confirmation is enabled in Supabase, confirm the email before logging in. Add `http://localhost:3000/login?confirmed=1` to the Supabase Auth redirect allow list. `DATABASE_URL` must be the Postgres URI for the same Supabase project as `SUPABASE_URL`; URL-encode special characters in its password. `.env.local` is ignored by Git. The database seed truncates catalog, coupon, pincode, order, address and local profile data, so run it only on a new database or when you intend to reset that data.

For a Supabase Auth account that needs admin access, assign its role from the Supabase SQL editor after signup: `UPDATE users SET role = 'admin' WHERE email = 'your@email.example';`. Never set roles from signup metadata or the client.

## Feature overview
- **Catalog**: 8 categories, 96 products, search, category browsing, product detail pages
- **Cart**: persisted in `localStorage`, live bill summary, free-delivery progress bar, coupon codes
- **Checkout**: saved/new delivery addresses, pincode serviceability check, mock payment method selection
- **Orders**: order history, order detail with a 5-step status timeline and a live "~10 min" ETA countdown
- **Admin panel** (`/admin`, role-protected): dashboard stats, product CRUD, category CRUD, order status updates, coupon CRUD, pincode management

All pricing (item total, delivery fee, handling fee, coupon discount, grand total) is computed **server-side** in `src/lib/pricing.ts` from the authoritative database product prices — client-sent prices are never trusted when an order is created.

## Order status flow
`placed → confirmed → packed → out_for_delivery → delivered` (plus `cancelled`). When an admin updates a status in `/admin/orders`, the customer sees it immediately the next time they load `/orders/[id]`.

## Requirements traceability

| ID | Requirement | Implementation |
|---|---|---|
| FR-01 | Browse & search products | `/`, `/category/[slug]`, `/search`, `GET /api/products` |
| FR-02 | Add items to cart & manage quantities | `CartContext`, `/cart`, `QtyStepper` |
| FR-03 | Place an order with address & payment method | `/checkout`, `POST /api/orders` |
| FR-04 | Customer can view order status | `/orders`, `/orders/[id]`, `StatusTimeline`, `EtaCountdown` |
| FR-05 | Admin can update order status | `/admin/orders/[id]`, `PATCH /api/orders/[id]` |
| FR-06 | Set an order budget and compare the basket against it | `/cart`, `/budget`, `GET/POST /api/budget`, `POST /api/budget/preview` |
| FR-07 | View weekly/monthly completed-order spend and cheaper alternatives | Budget Guard, `GET /api/budget`, `POST /api/budget/suggestions` |
| FR-08 | Track ₹5,000 net qualifying spend and a persistent 30-day history window | `/paylater`, `GET/POST /api/paylater` |
| FR-09 | Keep PayLater disabled until an authorized lending partner is integrated | `/checkout`, `/paylater`; server rejects installment orders |

| Test case | Scenario | Expected result | Status |
|---|---|---|---|
| TC-01 | Try to check out with an empty cart | Checkout button hidden; empty-state shown on `/cart` prompting to shop | ✅ Pass |
| TC-02 | Add a quantity above available stock | Stepper caps at `product.stock`; server also rejects with 422 if stock is insufficient at order time | ✅ Pass |
| TC-03 | Apply an invalid/expired coupon code | `POST /api/coupons/validate` returns 404/410/422 with a clear message; cart is unaffected | ✅ Pass |
| TC-04 | Place an order, then admin changes its status | Customer's `/orders/[id]` reflects the new status & timeline on next load | ✅ Pass |
| TC-05 | Register with an email that already exists | `POST /api/auth/register` returns 409 and the form shows the error | ✅ Pass |
| TC-06 | Non-admin user visits `/admin` | Server-side redirect to `/login?next=/admin`; API routes return 401 | ✅ Pass |

## Out of scope
Live GPS tracking, real payment gateways, and real credit are intentionally **not** implemented.

## Advanced feature integration

- **Smart Basket** (`/`): authenticated reorder suggestions use completed purchase intervals and recency. First-time users get starter picks. Suggestions explain their reason, allow quantity edits and dismissal, and revalidate stock/prices before adding to cart. This is a transparent rules-based baseline; no ML model is running.
- **Budget Guard** (`/budget`, `/cart`, `/checkout`): saves a per-order budget to the signed-in account, shows server-calculated basket remaining, weekly/monthly net spending from delivered orders, and lower-priced same-category alternatives. Replacements happen only when the customer selects them. Checkout asks for explicit confirmation if the server-calculated total exceeds the saved budget.
- **PayLater** (`/paylater`): shows net qualifying delivered spend after recorded refunds, persistent 30-day history, target progress, and a once-per-user DEMO history review. Eligibility requires both ₹5,000 net spend and 30 completed days. The transparent demo score is informational only; no lender is connected, no credit limit or balance is simulated, and installment checkout is disabled.
- **Checkout payments**: retains COD, UPI and card. Non-COD orders start pending. A development-only payment outcome simulator is available on the order page and is disabled in production. PayLater requires an authorized lending partner integration before transactions or schedules can be offered.
- **Database**: Drizzle adds per-user budget settings, delivery timestamps, refund tracking, `emi_reviews`, `payment_records`, `smart_basket_feedback`, and a per-user order idempotency key. Admins can record an externally confirmed refund with its provider reference; QuickBasket does not execute refunds.
- **Environment**: copy `.env.example`; use a unique `AUTH_SECRET` and keep provider credentials out of source control. Demo mode requires no payment/lending credentials.
- **Authentication**: Supabase Auth validates email/password. Supabase Postgres stores QuickBasket profiles and orders. Existing local password hashes are migrated to Supabase on a successful legacy login; profile role and order history are preserved.
- **API details**: see [docs/API.md](docs/API.md) for endpoints, demo rules, and requirements for verified payment webhooks or an authorized lending partner.

Verification: `npm test` covers server pricing totals and demo installment rounding; `npm run typecheck`, `npm run lint`, and `npm run build` cover the integrated app. Database-backed journeys require the configured Supabase Postgres database and Supabase Auth project.
