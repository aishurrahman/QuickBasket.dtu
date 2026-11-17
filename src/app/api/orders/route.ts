import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orders, orderItems, products, coupons, paymentRecords, budgetSettings } from "@/db/schema";
import { desc, eq, inArray, and, gte, sql } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";
import { computeTotals, PRICING_CONFIG } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  const rows =
    all && session.role === "admin"
      ? await db.select().from(orders).orderBy(desc(orders.placedAt))
      : await db.select().from(orders).where(eq(orders.userId, session.userId)).orderBy(desc(orders.placedAt));

  if (rows.length === 0) return jsonOk({ orders: [] });

  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((r) => r.id),
      ),
    );

  const ordersWithItems = rows.map((order) => ({
    ...order,
    items: items.filter((i) => i.orderId === order.id),
  }));

  return jsonOk({ orders: ordersWithItems });
}

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Cart is empty")
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, "Cart contains a duplicate product"),
  addressId: z.number().int().optional(),
  address: z
    .object({
      label: z.string().optional(),
      line1: z.string().min(3),
      line2: z.string().optional(),
      city: z.string().min(2),
      state: z.string().min(2),
      pincode: z.string().min(4),
      phone: z.string().min(10),
    })
    .optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["cod", "upi", "card", "installments"]).default("cod"),
  idempotencyKey: z.string().min(8).max(100).optional(),
  budgetAcknowledged: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Please log in to place an order", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid order", 422);

  const { items, address, couponCode, paymentMethod, idempotencyKey, budgetAcknowledged } = parsed.data;

  if (idempotencyKey) {
    const [existing] = await db.select().from(orders).where(and(eq(orders.userId, session.userId), eq(orders.idempotencyKey, idempotencyKey))).limit(1);
    if (existing) {
      const existingItems = await db.select().from(orderItems).where(eq(orderItems.orderId, existing.id));
      return jsonOk({ order: { ...existing, items: existingItems }, duplicate: true });
    }
  }

  if (paymentMethod === "installments") {
    return jsonError("QuickBasket PayLater is in DEMO mode. No lending partner is connected, so installment checkout is unavailable.", 503);
  }

  if (!address) return jsonError("Delivery address is required", 422);

  const productIds = items.map((i) => i.productId);
  const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));

  if (dbProducts.length !== productIds.length) {
    return jsonError("One or more products are no longer available", 422);
  }

  const lineItems = [] as { product: (typeof dbProducts)[number]; quantity: number; price: number }[];
  for (const item of items) {
    const product = dbProducts.find((p) => p.id === item.productId)!;
    if (!product.isActive) return jsonError(`${product.name} is currently unavailable`, 422);
    if (product.stock < item.quantity) return jsonError(`Only ${product.stock} left for ${product.name}`, 422);
    lineItems.push({ product, quantity: item.quantity, price: Number(product.price) });
  }

  let couponRow = null;
  if (couponCode) {
    const [c] = await db.select().from(coupons).where(eq(coupons.code, couponCode.toUpperCase())).limit(1);
    if (c && c.isActive) couponRow = c;
  }

  const totals = computeTotals(
    lineItems.map((li) => ({ price: li.price, quantity: li.quantity })),
    couponRow
      ? {
          discountType: couponRow.discountType,
          discountValue: Number(couponRow.discountValue),
          minOrderValue: Number(couponRow.minOrderValue),
          maxDiscount: couponRow.maxDiscount ? Number(couponRow.maxDiscount) : null,
        }
      : null,
  );
  const [budgetSetting] = await db.select().from(budgetSettings).where(eq(budgetSettings.userId, session.userId)).limit(1);
  const budgetLimit = budgetSetting ? Number(budgetSetting.perOrderLimit) : null;
  if (budgetLimit !== null && totals.total > budgetLimit && !budgetAcknowledged) {
    return jsonError("This order is above your per-order budget. Review the total and confirm to continue.", 409, {
      code: "BUDGET_EXCEEDED", budgetLimit, orderTotal: totals.total,
    });
  }

  try {
    const order = await db.transaction(async (tx) => {
    const [orderRow] = await tx
      .insert(orders)
      .values({
        userId: session.userId,
        status: "placed",
        subtotal: totals.subtotal.toFixed(2),
        deliveryFee: totals.deliveryFee.toFixed(2),
        handlingFee: totals.handlingFee.toFixed(2),
        discount: totals.discount.toFixed(2),
        total: totals.total.toFixed(2),
        couponCode: couponRow ? couponRow.code : null,
        address,
        paymentMethod,
        idempotencyKey,
        // No payment provider is configured. Never infer payment success from checkout UI.
        paymentStatus: "pending",
        etaMinutes: PRICING_CONFIG.etaMinutes,
      })
      .returning();

    await tx.insert(orderItems).values(
      lineItems.map((li) => ({
        orderId: orderRow.id,
        productId: li.product.id,
        name: li.product.name,
        unit: li.product.unit,
        imageEmoji: li.product.imageEmoji,
        price: li.price.toFixed(2),
        quantity: li.quantity,
      })),
    );

    if (paymentMethod !== "cod") {
      await tx.insert(paymentRecords).values({
        orderId: orderRow.id,
        userId: session.userId,
        method: paymentMethod,
        amount: totals.total.toFixed(2),
        status: "pending",
        idempotencyKey: `user-${session.userId}-order-${orderRow.id}-payment`,
      });
    }

    for (const li of lineItems) {
      const [updated] = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${li.quantity}` })
        .where(and(eq(products.id, li.product.id), eq(products.isActive, true), gte(products.stock, li.quantity)))
        .returning({ id: products.id });
      if (!updated) throw new Error(`Stock changed while placing the order. Please review your cart.`);
    }
    return { ...orderRow, items: lineItems };
    });
    return jsonOk({ order }, 201);
  } catch (err) {
    if (idempotencyKey) {
      const [existing] = await db.select().from(orders).where(and(eq(orders.userId, session.userId), eq(orders.idempotencyKey, idempotencyKey))).limit(1);
      if (existing) {
        const existingItems = await db.select().from(orderItems).where(eq(orderItems.orderId, existing.id));
        return jsonOk({ order: { ...existing, items: existingItems }, duplicate: true });
      }
    }
    const message = err instanceof Error ? err.message : "Could not place order";
    return jsonError(message, 422);
  }
}
