import assert from "node:assert/strict";
import test from "node:test";
import { calculateDemoTrustScore, getPayLaterEligibility } from "../src/lib/paylater-eligibility";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-18T12:00:00.000Z");

function purchase(total: number, daysAgo: number, overrides: Partial<{ refundAmount: number; paymentStatus: string }> = {}) {
  const deliveredAt = new Date(now.getTime() - daysAgo * DAY_MS);
  return { total, subtotal: total, discount: 0, refundAmount: overrides.refundAmount ?? 0, paymentStatus: overrides.paymentStatus ?? "paid", deliveredAt, updatedAt: deliveredAt };
}

test("PayLater requires both the net spend target and a full 30-day history", () => {
  const waiting = getPayLaterEligibility([purchase(5000, 29)], now);
  assert.equal(waiting.status, "Spending Target Reached");
  assert.equal(waiting.daysRemaining, 1);
  assert.equal(waiting.timeMet, false);

  const eligible = getPayLaterEligibility([purchase(5000, 30)], now);
  assert.equal(eligible.status, "Eligible for EMI Review");
  assert.equal(eligible.spendMet, true);
  assert.equal(eligible.timeMet, true);
});

test("refunds reduce qualifying spend and failed or fully refunded orders do not start the timer", () => {
  const partiallyRefunded = getPayLaterEligibility([purchase(6000, 31, { refundAmount: 1000 })], now);
  assert.equal(partiallyRefunded.spend, 5000);
  assert.equal(partiallyRefunded.status, "Eligible for EMI Review");

  const failed = getPayLaterEligibility([purchase(6000, 31, { paymentStatus: "failed" })], now);
  assert.equal(failed.first, null);
  assert.equal(failed.spend, 0);

  const refunded = getPayLaterEligibility([purchase(6000, 31, { paymentStatus: "refunded" })], now);
  assert.equal(refunded.first, null);
  assert.equal(refunded.amountRemaining, 5000);
});

test("demo TrustScore is bounded and deterministic", () => {
  assert.equal(calculateDemoTrustScore({ orderCount: 5, spend: 5000, cancellations: 0, failedPayments: 0 }), 85);
  assert.equal(calculateDemoTrustScore({ orderCount: 0, spend: 0, cancellations: 20, failedPayments: 20 }), 0);
  assert.equal(calculateDemoTrustScore({ orderCount: 99, spend: 99000, cancellations: 0, failedPayments: 0 }), 85);
});
