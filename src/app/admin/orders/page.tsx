"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/pricing";

type Order = {
  id: number;
  userId: number;
  status: OrderStatus;
  total: string;
  placedAt: string;
  paymentMethod: string;
};

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");

  async function load() {
    const data = await fetch("/api/orders?all=true").then((r) => r.json());
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/orders?all=true")
      .then((r) => r.json())
      .then((data) => {
        if (active) setOrders(data.orders ?? []);
      });

    return () => {
      active = false;
    };
  }, []);

  async function updateStatus(id: number, status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error ?? "Could not update status", "error");
      return;
    }
    showToast(`Order #${id} marked as ${STATUS_LABELS[status]}`, "success");
    load();
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Orders</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${filter === "all" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}
        >
          All ({orders.length})
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${filter === s ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <th className="p-3">Order</th>
              <th className="p-3">Placed</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-semibold text-slate-800">
                  <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                    #{o.id}
                  </Link>
                </td>
                <td className="p-3 text-slate-400">{new Date(o.placedAt).toLocaleString()}</td>
                <td className="p-3 uppercase text-slate-500">{o.paymentMethod}</td>
                <td className="p-3 font-bold">{formatCurrency(o.total)}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      o.status === "delivered" ? "bg-emerald-100 text-emerald-700" : o.status === "cancelled" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="p-3">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No orders in this filter.</p>}
      </div>
    </div>
  );
}
