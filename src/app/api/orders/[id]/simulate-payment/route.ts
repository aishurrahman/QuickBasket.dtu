import { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, orders, paymentRecords, products } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-utils";

const schema = z.object({ outcome: z.enum(["success", "failed", "cancelled"]) });
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") return jsonError("Payment simulation is disabled in production", 404);
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid simulation outcome", 422);
  const orderId = Number((await params).id);
  if (!Number.isInteger(orderId) || orderId < 1) return jsonError("Order not found", 404);
  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, session.userId))).limit(1);
      if (!order) throw new Error("Order not found");
      const [payment] = await tx.select().from(paymentRecords).where(and(eq(paymentRecords.orderId, orderId), eq(paymentRecords.userId, session.userId))).limit(1);
      if (!payment) throw new Error("This order has no simulated online payment");
      if (payment.status !== "pending") {
        if ((parsed.data.outcome === "success" && payment.status === "paid") || (parsed.data.outcome === "failed" && payment.status === "failed") || (parsed.data.outcome === "cancelled" && payment.status === "cancelled")) return { order, payment, repeated: true };
        throw new Error("This payment attempt has already been completed");
      }
      const status = parsed.data.outcome === "success" ? "paid" : parsed.data.outcome;
      const [updatedPayment] = await tx.update(paymentRecords).set({ status, providerReference: `DEMO-PAY-${payment.id}`, updatedAt: new Date() }).where(and(eq(paymentRecords.id, payment.id), eq(paymentRecords.status, "pending"))).returning();
      if (!updatedPayment) throw new Error("Payment was already processed");
      const [updatedOrder] = await tx.update(orders).set({ paymentStatus: status === "paid" ? "paid" : status, ...(status === "cancelled" ? { status: "cancelled" } : {}), updatedAt: new Date() }).where(eq(orders.id, orderId)).returning();
      if (status === "cancelled") {
        const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        for (const line of lines) if (line.productId) await tx.update(products).set({ stock: sql`${products.stock} + ${line.quantity}` }).where(eq(products.id, line.productId));
      }
      return { order: updatedOrder, payment: updatedPayment, repeated: false };
    });
    return jsonOk({ ...result, mode: "DEMO" });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Could not process simulated payment", 409);
  }
}
