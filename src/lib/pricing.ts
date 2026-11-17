export const CURRENCY_SYMBOL = "₹";

export const PRICING_CONFIG = {
  deliveryFee: 25,
  freeDeliveryThreshold: 299,
  handlingFee: 6,
  etaMinutes: 10,
};

export function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? Number(value) : value;
  return `${CURRENCY_SYMBOL}${num.toFixed(0)}`;
}

export function formatPreciseCurrency(value: number | string) {
  const num = typeof value === "string" ? Number(value) : value;
  return `${CURRENCY_SYMBOL}${num.toFixed(2)}`;
}

export function calculateDemoInstallments(principal: number, months: number, annualRate = 0.12, fee = 99) {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isInteger(months) || months < 1) {
    throw new Error("Principal and installment term must be positive");
  }
  const interest = round2(principal * annualRate * (months / 12));
  const total = round2(principal + interest + fee);
  const regular = Math.floor((total / months) * 100) / 100;
  const schedule = Array.from({ length: months }, (_, i) => i === months - 1 ? round2(total - regular * (months - 1)) : regular);
  return { principal: round2(principal), interest, fee: round2(fee), total, schedule };
}

export type PricingLineItem = {
  price: number;
  quantity: number;
};

export type CouponInput = {
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
} | null;

export function computeTotals(items: PricingLineItem[], coupon: CouponInput) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= PRICING_CONFIG.freeDeliveryThreshold || subtotal === 0 ? 0 : PRICING_CONFIG.deliveryFee;
  const handlingFee = subtotal === 0 ? 0 : PRICING_CONFIG.handlingFee;

  let discount = 0;
  if (coupon && subtotal >= coupon.minOrderValue) {
    if (coupon.discountType === "percent") {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }
    discount = Math.min(discount, subtotal);
  }

  const total = Math.max(subtotal + deliveryFee + handlingFee - discount, 0);

  return {
    subtotal: round2(subtotal),
    deliveryFee: round2(deliveryFee),
    handlingFee: round2(handlingFee),
    discount: round2(discount),
    total: round2(total),
    etaMinutes: PRICING_CONFIG.etaMinutes,
    freeDeliveryRemaining: Math.max(PRICING_CONFIG.freeDeliveryThreshold - subtotal, 0),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const ORDER_STATUSES = ["placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_FLOW: OrderStatus[] = ["placed", "confirmed", "packed", "out_for_delivery", "delivered"];
