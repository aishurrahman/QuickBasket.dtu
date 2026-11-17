import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, paymentRecords, refunds } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-utils";

const schema = z.object({
  amount: z.number().finite().positive().max(1000000).refine((value) => Number.isInteger(value * 100), "Refund amount can have at most two decimal places"),
  providerReference: z.string().trim().min(3).max(120),
});

// This records a refund already confirmed by an external payment provider. It
// does not send money or simulate a provider response.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return jsonError("Unauthorized", 401);
  const orderId = Number((await params).id);
  if (!Number.isSafeInteger(orderId) || orderId < 1) return jsonError("Order not found", 404);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid refund", 422);

  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) throw new Error("Order not found");
      const [duplicate] = await tx.select().from(refunds).where(eq(refunds.providerReference, parsed.data.providerReference)).limit(1);
      if (duplicate) {
        if (duplicate.orderId !== order.id || Number(duplicate.amount) !== parsed.data.amount) throw new Error("Provider reference was already used for a different refund");
        const [latest] = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
        return { order: latest, duplicate: true };
      }
      if (!new Set(["paid", "partially_refunded", "refund_pending"]).has(order.paymentStatus)) throw new Error("Only a confirmed payment can be refunded");
      const previous = Number(order.refundAmount ?? 0);
      const next = Math.round((previous + parsed.data.amount) * 100) / 100;
      if (next > Number(order.total) + 0.001) throw new Error("Refund total cannot exceed the order total");

      await tx.insert(refunds).values({ orderId: order.id, userId: order.userId, amount: parsed.data.amount.toFixed(2), providerReference: parsed.data.providerReference });
      const paymentStatus = next >= Number(order.total) ? "refunded" : "partially_refunded";
      const [updated] = await tx.update(orders).set({ refundAmount: next.toFixed(2), paymentStatus, updatedAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.refundAmount, order.refundAmount))).returning();
      if (!updated) throw new Error("Refund totals changed concurrently; reload and retry");
      await tx.update(paymentRecords).set({ status: paymentStatus, updatedAt: new Date() }).where(and(
        eq(paymentRecords.orderId, order.id),
        inArray(paymentRecords.status, ["paid", "partially_refunded", "refund_pending"]),
      ));
      return { order: updated, duplicate: false };
    });
    return jsonOk(result, result.duplicate ? 200 : 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not record refund", 409);
  }
}
