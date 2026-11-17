"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, STATUS_LABELS, type OrderStatus } from "@/lib/pricing";

type OrderSummary = {
  id: number;
  status: OrderStatus;
  total: string;
  placedAt: string;
  items: { id: number; name: string; quantity: number; imageEmoji: string | null }[];
};

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?next=/orders");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || fetching) {
    return <main className="px-4 py-16 text-center text-slate-400">Loading orders...</main>;
  }

  if (orders.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-6xl">📦</p>
        <h1 className="mt-4 text-xl font-extrabold text-slate-800">No orders yet</h1>
        <p className="mt-2 text-slate-500">When you place an order, it will show up here.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700">
          Start Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-extrabold text-slate-800">My Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800">Order #{order.id}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  order.status === "delivered"
                    ? "bg-emerald-100 text-emerald-700"
                    : order.status === "cancelled"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{new Date(order.placedAt).toLocaleString()}</p>
            <p className="mt-2 truncate text-sm text-slate-600">
              {order.items.map((i) => `${i.imageEmoji ?? "🛍️"} ${i.name} ×${i.quantity}`).join(", ")}
            </p>
            <p className="mt-2 font-bold text-slate-900">{formatCurrency(order.total)}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
