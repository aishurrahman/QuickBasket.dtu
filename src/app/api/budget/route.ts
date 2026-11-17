import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgetSettings, orders } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { getNetQualifyingSpend } from "@/lib/paylater-eligibility";

const settingSchema = z.object({ perOrderLimit: z.number().finite().min(100).max(100000).nullable() });

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const now = new Date();
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [setting] = await db.select().from(budgetSettings).where(eq(budgetSettings.userId, session.userId)).limit(1);
  const rows = await db.select({ total: orders.total, subtotal: orders.subtotal, discount: orders.discount, refundAmount: orders.refundAmount, paymentStatus: orders.paymentStatus, status: orders.status, deliveredAt: orders.deliveredAt, updatedAt: orders.updatedAt })
    .from(orders).where(and(eq(orders.userId, session.userId), eq(orders.status, "delivered")));
  const spend = rows.map((order) => ({ at: order.deliveredAt ?? order.updatedAt, amount: getNetQualifyingSpend(order) }));
  const qualifying = spend.filter((entry) => entry.amount > 0);
  const week = qualifying.filter((entry) => entry.at >= weekStart).reduce((sum, entry) => sum + entry.amount, 0);
  const month = qualifying.filter((entry) => entry.at >= monthStart).reduce((sum, entry) => sum + entry.amount, 0);

  return jsonOk({
    perOrderLimit: setting ? Number(setting.perOrderLimit) : null,
    weeklySpend: Math.round(week * 100) / 100,
    monthlySpend: Math.round(month * 100) / 100,
    completedOrders: qualifying.length,
    weekStartsAt: weekStart.toISOString(),
    monthStartsAt: monthStart.toISOString(),
    personalizedTip: month > 0
      ? `You have spent ₹${Math.round(month)} on delivered orders this month. Review cheaper basket alternatives before checkout.`
      : "Your delivered-order spending summary will appear here after your first completed order.",
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const parsed = settingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Set an order budget between ₹100 and ₹100,000, or use null to clear it", 422);

  if (parsed.data.perOrderLimit === null) {
    await db.delete(budgetSettings).where(eq(budgetSettings.userId, session.userId));
    return jsonOk({ perOrderLimit: null });
  }

  const value = parsed.data.perOrderLimit.toFixed(2);
  const [setting] = await db.insert(budgetSettings).values({ userId: session.userId, perOrderLimit: value })
    .onConflictDoUpdate({ target: budgetSettings.userId, set: { perOrderLimit: value, updatedAt: new Date() } })
    .returning();
  return jsonOk({ perOrderLimit: Number(setting.perOrderLimit) });
}
