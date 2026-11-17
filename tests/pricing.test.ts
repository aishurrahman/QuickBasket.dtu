import assert from "node:assert/strict";
import test from "node:test";
import { calculateDemoInstallments, computeTotals } from "../src/lib/pricing";

test("demo EMI uses rounded simple interest, fee, and exact final installment", () => {
  const calc = calculateDemoInstallments(1000, 3);
  assert.equal(calc.interest, 30);
  assert.equal(calc.fee, 99);
  assert.equal(calc.total, 1129);
  assert.deepEqual(calc.schedule, [376.33, 376.33, 376.34]);
  assert.equal(Math.round(calc.schedule.reduce((sum, amount) => sum + amount, 0) * 100), 112900);
});

test("demo EMI supports zero-interest terms and rejects invalid input", () => {
  assert.deepEqual(calculateDemoInstallments(100, 2, 0, 0).schedule, [50, 50]);
  assert.throws(() => calculateDemoInstallments(0, 3));
  assert.throws(() => calculateDemoInstallments(100, 2.5));
});

test("server price totals preserve delivery, fee and coupon rounding", () => {
  const totals = computeTotals([{ price: 100, quantity: 2 }], { discountType: "percent", discountValue: 10, minOrderValue: 0, maxDiscount: null });
  assert.deepEqual({ subtotal: totals.subtotal, deliveryFee: totals.deliveryFee, handlingFee: totals.handlingFee, discount: totals.discount, total: totals.total }, { subtotal: 200, deliveryFee: 25, handlingFee: 6, discount: 20, total: 211 });
});
