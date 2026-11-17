import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgetSettings, coupons, products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { computeTotals } from "@/lib/pricing";
import { jsonError, jsonOk } from "@/lib/api-utils";

const schema = z.object({
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20) })).min(1).max(30)
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, "Cart has duplicate items"),
  couponCode: z.string().trim().max(40).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid basket", 422);

  const ids = parsed.data.items.map((item) => item.productId);
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  if (rows.length !== ids.length) return jsonError("A basket product is no longer available", 409);
  for (const item of parsed.data.items) {
    const product = rows.find((row) => row.id === item.productId)!;
    if (!product.isActive || product.stock < item.quantity) return jsonError(`${product.name} is no longer available in that quantity`, 409);
  }

  let coupon = null;
  if (parsed.data.couponCode) {
    [coupon] = await db.select().from(coupons).where(and(eq(coupons.code, parsed.data.couponCode.toUpperCase()), eq(coupons.isActive, true))).limit(1);
    if (coupon?.expiresAt && coupon.expiresAt <= new Date()) coupon = null;
  }
  const totals = computeTotals(parsed.data.items.map((item) => ({
    price: Number(rows.find((row) => row.id === item.productId)!.price), quantity: item.quantity,
  })), coupon ? {
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    minOrderValue: Number(coupon.minOrderValue),
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
  } : null);
  const [budget] = await db.select().from(budgetSettings).where(eq(budgetSettings.userId, session.userId)).limit(1);
  const limit = budget ? Number(budget.perOrderLimit) : null;
  return jsonOk({ total: totals.total, perOrderLimit: limit, remaining: limit === null ? null : Math.round((limit - totals.total) * 100) / 100, overBudget: limit !== null && totals.total > limit, totals });
}
