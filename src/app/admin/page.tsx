import Link from "next/link";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { StatCard } from "@/components/admin/StatCard";
import { formatCurrency, STATUS_LABELS, type OrderStatus } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
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
      lowStock: sql<number>`count(*) filter (where ${products.stock} < 10)::int`,
    })
    .from(products);

  const [userStats] = await db
    .select({ totalCustomers: sql<number>`count(*) filter (where ${users.role} = 'customer')::int` })
    .from(users);

  const recentOrders = await db.select().from(orders).orderBy(sql`${orders.placedAt} desc`).limit(8);

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Orders" value={orderStats.totalOrders} icon="📦" />
        <StatCard label="Revenue" value={formatCurrency(orderStats.totalRevenue)} icon="💰" accent="text-emerald-600" />
        <StatCard label="Pending Orders" value={orderStats.pendingOrders} icon="⏳" accent="text-amber-600" />
        <StatCard label="Products" value={productStats.totalProducts} icon="🛍️" />
        <StatCard label="Low Stock (<10)" value={productStats.lowStock} icon="⚠️" accent="text-rose-600" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Customers" value={userStats.totalCustomers} icon="👥" />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-700">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm font-bold text-emerald-700 hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 pr-3 font-semibold text-slate-800">
                    <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                      #{o.id}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{STATUS_LABELS[o.status as OrderStatus]}</td>
                  <td className="py-2 pr-3 font-bold">{formatCurrency(o.total)}</td>
                  <td className="py-2 pr-3 text-slate-400">{new Date(o.placedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
