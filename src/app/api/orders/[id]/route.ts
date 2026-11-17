import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { products, paymentRecords } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/pricing";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, Number(id))).limit(1);
  if (!order) return jsonError("Order not found", 404);
  if (order.userId !== session.userId && session.role !== "admin") {
    return jsonError("Unauthorized", 403);
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return jsonOk({ order: { ...order, items } });
}

const schema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return jsonError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid status", 422);

  try {
    const row = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(orders).where(eq(orders.id, Number(id))).limit(1);
      if (!current) return null;
      if (current.status === "cancelled" && parsed.data.status !== "cancelled") throw new Error("A cancelled order cannot be reopened");
      if (parsed.data.status === "cancelled" && current.status !== "cancelled") {
        const [pay] = await tx.select().from(paymentRecords).where(and(eq(paymentRecords.orderId, current.id), inArray(paymentRecords.status, ["paid", "partially_refunded"]))).limit(1);
        const paymentStatus = pay ? "refund_pending" : "cancelled";
        const [updated] = await tx.update(orders).set({ status: "cancelled", paymentStatus, updatedAt: new Date() }).where(and(eq(orders.id, current.id), ne(orders.status, "cancelled"))).returning();
        if (!updated) return current;
        const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, current.id));
        for (const line of lines) if (line.productId) await tx.update(products).set({ stock: sql`${products.stock} + ${line.quantity}` }).where(eq(products.id, line.productId));
        await tx.update(paymentRecords).set({ status: paymentStatus, updatedAt: new Date() }).where(eq(paymentRecords.orderId, current.id));
        return updated;
      }
      const [updated] = await tx.update(orders).set({
        status: parsed.data.status,
        deliveredAt: parsed.data.status === "delivered" ? current.deliveredAt ?? new Date() : current.deliveredAt,
        updatedAt: new Date(),
      }).where(eq(orders.id, current.id)).returning();
      return updated;
    });
    if (!row) return jsonError("Order not found", 404);
    return jsonOk({ order: row });
  } catch { return jsonError("Could not update order status", 409); }
}
