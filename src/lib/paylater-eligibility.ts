export const PAYLATER_SPEND_TARGET = 5000;
export const PAYLATER_HISTORY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DeliveredPurchase = {
  deliveredAt: Date | null;
  updatedAt: Date;
  total: string | number;
  subtotal: string | number;
  discount: string | number;
  refundAmount: string | number;
  paymentStatus: string;
};

export function getNetQualifyingSpend(order: Pick<DeliveredPurchase, "total" | "subtotal" | "discount" | "refundAmount" | "paymentStatus">) {
  if (["failed", "cancelled"].includes(order.paymentStatus)) return 0;
  if (order.paymentStatus === "refunded") return 0;
  const groceries = Math.max(0, Number(order.subtotal) - Number(order.discount));
  return Math.max(0, Math.round((groceries - Number(order.refundAmount ?? 0)) * 100) / 100);
}

export function getPayLaterEligibility(history: DeliveredPurchase[], now = new Date()) {
  const qualifying = history.map((order) => ({ ...order, at: order.deliveredAt ?? order.updatedAt, amount: getNetQualifyingSpend(order) }))
    .filter((order) => order.amount > 0).sort((a, b) => a.at.getTime() - b.at.getTime());
  const spend = Math.round(qualifying.reduce((sum, order) => sum + order.amount, 0) * 100) / 100;
  const first = qualifying[0]?.at ?? null;
  const elapsedDays = first ? Math.max(0, Math.floor((now.getTime() - first.getTime()) / DAY_MS)) : 0;
  const spendMet = spend >= PAYLATER_SPEND_TARGET;
  const timeMet = elapsedDays >= PAYLATER_HISTORY_DAYS;
  const status = spendMet && timeMet ? "Eligible for EMI Review" : spendMet ? "Spending Target Reached" : "Building History";

  return {
    qualifying,
    spend,
    first,
    elapsedDays,
    spendMet,
    timeMet,
    status,
    amountRemaining: Math.max(0, Math.round((PAYLATER_SPEND_TARGET - spend) * 100) / 100),
    daysRemaining: Math.max(0, PAYLATER_HISTORY_DAYS - elapsedDays),
  };
}

export function calculateDemoTrustScore(input: { orderCount: number; spend: number; cancellations: number; failedPayments: number }) {
  return Math.max(0, Math.min(100,
    50 + Math.min(input.orderCount, 5) * 5 + Math.min(Math.floor(input.spend / 1000), 5) * 2 - input.cancellations * 8 - input.failedPayments * 10,
  ));
}
