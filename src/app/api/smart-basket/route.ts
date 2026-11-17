import { NextRequest } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, orders, products, smartBasketFeedback } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-utils";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const completed = await db.select({ id: orders.id, placedAt: orders.placedAt }).from(orders)
    .where(and(eq(orders.userId, session.userId), eq(orders.status, "delivered"))).orderBy(asc(orders.placedAt));
  const items = completed.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, completed.map((o) => o.id))) : [];
  const catalog = await db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name));
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const days = new Map<number, { at: Date; qty: number }[]>();
  for (const item of items) {
    if (!item.productId) continue;
    const list = days.get(item.productId) ?? [];
    const order = completed.find((o) => o.id === item.orderId);
    if (order) list.push({ at: order.placedAt, qty: item.quantity });
    days.set(item.productId, list);
  }
  const recommendations = [...days.entries()].flatMap(([id, purchases]) => {
    const product = byId.get(id);
    if (!product || product.stock < 1 || purchases.length < 2) return [];
    const intervals = purchases.slice(1).map((p, i) => Math.max(1, Math.round((p.at.getTime() - purchases[i].at.getTime()) / 86400000)));
    const interval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    const elapsed = Math.floor((Date.now() - purchases[purchases.length - 1].at.getTime()) / 86400000);
    if (elapsed < Math.max(1, interval - 3)) return [];
    const quantity = Math.min(product.stock, Math.max(1, Math.round(purchases.reduce((n, p) => n + p.qty, 0) / purchases.length)));
    return [{ productId: id, name: product.name, unit: product.unit, price: Number(product.price), imageEmoji: product.imageEmoji, stock: product.stock, quantity, reason: `You usually reorder about every ${interval} days; last bought ${elapsed} days ago.`, predicted: true }];
  }).slice(0, 6);
  const fallback = recommendations.length ? [] : catalog.filter((p) => p.stock > 0).slice(0, 4).map((p) => ({ productId: p.id, name: p.name, unit: p.unit, price: Number(p.price), imageEmoji: p.imageEmoji, stock: p.stock, quantity: 1, reason: completed.length ? "A starter pick while we learn your reorder rhythm." : "A starter pick for your first basket.", predicted: false }));
  const feedback = await db.select({ productId: smartBasketFeedback.productId, action: smartBasketFeedback.action }).from(smartBasketFeedback).where(eq(smartBasketFeedback.userId, session.userId));
  const dismissed = new Set(feedback.filter((f) => f.action === "dismissed").map((f) => f.productId));
  return jsonOk({ recommendations: [...recommendations, ...fallback].filter((r) => !dismissed.has(r.productId)), algorithm: "transparent purchase-interval baseline; no ML model is running" });
}

const schema = z.object({ action: z.enum(["accepted", "edited", "dismissed", "add"]), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20).optional(), feedback: z.enum(["accepted", "edited"]).optional() })).min(1).max(30) });
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid recommendation action", 422);
  const ids = [...new Set(parsed.data.items.map((i) => i.productId))];
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  if (rows.length !== ids.length || rows.some((p) => !p.isActive || p.stock < 1)) return jsonError("A suggested product is unavailable; refresh your basket", 409);
  if (parsed.data.action === "add") {
    const invalid = parsed.data.items.find((i) => (i.quantity ?? 1) > (rows.find((p) => p.id === i.productId)?.stock ?? 0));
    if (invalid) return jsonError("Requested quantity exceeds current stock", 422);
  }
  await db.insert(smartBasketFeedback).values(parsed.data.items.map((item) => ({ userId: session.userId, productId: item.productId, action: parsed.data.action === "add" ? (item.feedback ?? "accepted") : parsed.data.action, quantity: item.quantity ?? null })));
  return jsonOk({ products: rows.map((p) => ({ productId: p.id, name: p.name, price: Number(p.price), mrp: Number(p.mrp), unit: p.unit, imageEmoji: p.imageEmoji, stock: p.stock })) });
}
