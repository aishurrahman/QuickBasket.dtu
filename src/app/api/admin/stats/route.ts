import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { sql, eq, ne } from "drizzle-orm";
import { jsonError, jsonOk } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Unauthorized", 401);

  const [orderStats] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      totalRevenue: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.status} != 'cancelled'), 0)`,
      pendingOrders: sql<number>`count(*) filter (where ${orders.status} not in ('delivered', 'cancelled'))::int`,
    })
    .from(orders);

  const [productStats] = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
      activeProducts: sql<number>`count(*) filter (where ${products.isActive})::int`,
      lowStock: sql<number>`count(*) filter (where ${products.stock} < 10)::int`,
    })
    .from(products);

  const [userStats] = await db
    .select({ totalCustomers: sql<number>`count(*) filter (where ${users.role} = 'customer')::int` })
    .from(users);

  const recentOrders = await db.select().from(orders).orderBy(sql`${orders.placedAt} desc`).limit(5);

  return jsonOk({
    totalOrders: orderStats.totalOrders,
    totalRevenue: Number(orderStats.totalRevenue),
    pendingOrders: orderStats.pendingOrders,
    totalProducts: productStats.totalProducts,
    activeProducts: productStats.activeProducts,
    lowStock: productStats.lowStock,
    totalCustomers: userStats.totalCustomers,
    recentOrders,
  });
}
