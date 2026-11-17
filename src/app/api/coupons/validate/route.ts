import { NextRequest } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { computeTotals } from "@/lib/pricing";

const demoCoupons = [
  {
    code: "WELCOME50",
    description: "Flat ₹50 off on your first order",
    discountType: "flat",
    discountValue: "50.00",
    minOrderValue: "199.00",
    maxDiscount: null,
    isActive: true,
    expiresAt: null,
  },
  {
    code: "SAVE10",
    description: "10% off up to ₹60",
    discountType: "percent",
    discountValue: "10.00",
    minOrderValue: "299.00",
    maxDiscount: "60.00",
    isActive: true,
    expiresAt: null,
  },
];

const schema = z.object({
  code: z.string().min(1),
  items: z.array(z.object({ price: z.number(), quantity: z.number() })),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request", 422);

  const { code, items } = parsed.data;
  const normalizedCode = code.trim().toUpperCase();
  const [coupon] = isDatabaseConfigured
    ? await db.select().from(coupons).where(eq(coupons.code, normalizedCode)).limit(1)
    : demoCoupons.filter((item) => item.code === normalizedCode);

  if (!coupon || !coupon.isActive) return jsonError("Invalid or expired coupon", 404);
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return jsonError("This coupon has expired", 410);
  }

  const totals = computeTotals(items, {
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    minOrderValue: Number(coupon.minOrderValue),
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
  });

  if (totals.discount === 0) {
    return jsonError(`Add items worth ${coupon.minOrderValue} or more to use this coupon`, 422);
  }

  return jsonOk({
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minOrderValue: Number(coupon.minOrderValue),
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    },
    totals,
  });
}
