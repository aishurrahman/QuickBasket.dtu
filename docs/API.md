# QuickBasket API and feature notes

Customer endpoints require the existing `qb_session` cookie and scope data to the signed-in user. Admin endpoints also require the user's database role to be `admin`. Errors use JSON `{ "error": "..." }`; order creation may return a `code` field for a budget confirmation.

## Authentication and setup

`POST /api/auth/register` calls Supabase `auth.signUp`; `POST /api/auth/login` calls `auth.signInWithPassword`. The local profile is linked by Supabase user ID, never by email alone. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`, `APP_URL`, and `AUTH_SECRET` in `.env.local`. `DATABASE_URL` must be a Postgres URI for the same Supabase project as `SUPABASE_URL`; URL-encode special characters in its password. Add `${APP_URL}/login?confirmed=1` to the Supabase Auth redirect allow list. Use only the publishable/anon key; never put a service-role key in this application.

Apply the database schema and starter data for a new database:

```bash
npx drizzle-kit push
npx tsx src/db/seed.ts
```

The seed truncates demo catalog, coupon, pincode, order, address and local profile rows. Run it only on a new database or when intentionally resetting that data.

## Budget Guard

Budgets and spending are account-specific. Spending is calculated from delivered orders using grocery subtotal less discounts and confirmed refunds; delivery and handling fees are excluded. Cancelled and failed orders do not count. The weekly total uses the current UTC calendar week; monthly uses the current UTC calendar month.

| Method and path | Purpose |
|---|---|
| `GET /api/budget` | Returns the user's saved per-order limit, weekly/monthly delivered spend, and a personalized summary. |
| `POST /api/budget` | Body `{ "perOrderLimit": 100..100000 }` saves the limit; `{ "perOrderLimit": null }` clears it. |
| `POST /api/budget/preview` | Body `{ "items": [{ "productId", "quantity" }], "couponCode?" }`. Reprices from current database prices and returns total, remaining budget, and `overBudget`. |
| `POST /api/budget/suggestions` | Body `{ "items": [{ "productId", "quantity" }] }`. Returns cheaper in-stock products from each item's category; it never changes the cart. |

`POST /api/orders` recomputes totals server-side. If a saved budget would be exceeded, it responds with `409`, `code: "BUDGET_EXCEEDED"`, and the calculated total/limit. The client must ask the customer to confirm and retry with `budgetAcknowledged: true`. A budget is a customer-set warning and does not block a confirmed order.

## PayLater eligibility and demo TrustScore

Eligibility requires at least **₹5,000 net qualifying spend** and **30 full days** since the first qualifying delivered order. Net spend is grocery subtotal less discounts and confirmed refund amounts; delivery and handling fees, failed orders, cancelled orders, and fully refunded purchases do not count. `deliveredAt` is stored once when an admin marks an order delivered, so the timer survives refreshes, sign-outs, and devices. For pre-existing delivered rows without `deliveredAt`, the system falls back to `updatedAt`.

Statuses are `Building History`, `Spending Target Reached`, `Waiting for 30 Days`, `Eligible for EMI Review`, and `Under Review`. Requesting a review writes only a DEMO history-review record. Its documented rule score is not a credit-risk model, loan decision, approval, or credit limit. No lender is configured, so no repayment schedule, credit balance, payment reminder, or installment checkout is represented as real.

| Method and path | Purpose |
|---|---|
| `GET /api/paylater` | Returns net spend, remaining target, first qualifying delivery, persistent 30-day progress, demo review, and actual QuickBasket order/payment history. Partner limit, EMI balances, and schedules remain null/empty. |
| `POST /api/paylater` | Records one DEMO review only after both eligibility prerequisites are met. Duplicate requests return the existing review. It never approves credit. |
| `POST /api/admin/orders/:id/refunds` | Admin-only record of a refund already confirmed by an external provider. Body `{ "amount": number, "providerReference": string }`. Idempotent by provider reference; does not send money. |

The PayLater page includes 3- and 6-month examples for cost education only. They are not lender-supported plans and cannot be chosen at checkout. Real installment offers require an authorized lending partner, partner-supplied terms and schedules, explicit acceptance, and verified server-side authorization before an order can use them.

## Existing and payment endpoints

| Method and path | Purpose |
|---|---|
| `GET /api/smart-basket` | Returns transparent purchase-interval suggestions or first-basket starter picks. No ML model runs. |
| `POST /api/smart-basket` | Persists recommendation feedback; `add` rechecks product status and stock. |
| `POST /api/orders` | Recomputes price, discounts, stock, user scope and budget warning server-side. Supports `cod`, `upi`, `card`, plus idempotency key. Installment orders are rejected while no lender is connected. |
| `POST /api/orders/:id/simulate-payment` | Development-only `{ "outcome": "success" | "failed" | "cancelled" }`; disabled in production and not a provider webhook. |

## External integrations and safety

There is no live payment provider or lending partner configured. UPI/card demo outcomes are not verified payments. Cancellation of a paid order becomes `refund_pending`; the app does not claim the money is refunded until an administrator records a provider-confirmed refund. The refund endpoint requires a provider reference and updates net-spend calculations. For production, implement a real provider adapter, verify webhook signatures over the raw request body, and only update payment/refund state from verified provider events.

QuickBasket never collects raw card numbers, CVVs, or UPI PINs. Do not claim a validated credit-risk AI model: the demo TrustScore is a transparent display heuristic only and cannot approve or decline financing.
