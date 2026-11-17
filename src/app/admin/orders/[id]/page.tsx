"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/pricing";
import { StatusTimeline } from "@/components/StatusTimeline";

type OrderDetail = {
  id: number;
  userId: number;
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  handlingFee: string;
  discount: string;
  total: string;
  couponCode: string | null;
  paymentMethod: string;
  paymentStatus: string;
  refundAmount: string;
  placedAt: string;
  address: { label: string; line1: string; line2?: string; city: string; state: string; pincode: string; phone: string };
  items: { id: number; name: string; unit: string; imageEmoji: string | null; price: string; quantity: number }[];
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [refundValue, setRefundValue] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();
    if (res.ok) setOrder(data.order);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/orders/${id}`)
      .then(async (res) => ({ res, data: await res.json() }))
      .then(({ res, data }) => {
        if (active && res.ok) setOrder(data.order);
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function updateStatus(status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Could not update", "error");
      return;
    }
    showToast("Status updated — visible to the customer now", "success");
    load();
  }

  async function recordRefund() {
    setRefundBusy(true);
    const res = await fetch(`/api/admin/orders/${id}/refunds`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(refundValue), providerReference: refundReference }),
    });
    const data = await res.json();
    setRefundBusy(false);
    if (!res.ok) { showToast(data.error ?? "Could not record refund", "error"); return; }
    showToast(data.duplicate ? "This provider refund was already recorded" : "Confirmed refund recorded", "success");
    setRefundValue(""); setRefundReference("");
    await load();
  }

  if (!order) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/orders" className="text-sm font-semibold text-slate-500 hover:underline">
        ← Back to orders
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Order #{order.id}</h1>
      <p className="text-sm text-slate-400">{new Date(order.placedAt).toLocaleString()}</p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <StatusTimeline status={order.status} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-bold text-slate-700">Update Status</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                order.status === s ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {(order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded" || order.paymentStatus === "refund_pending") && <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-bold text-amber-950">Record confirmed refund</h2><p className="mt-1 text-xs text-amber-900">Refund money through your authorized provider first. This form only records a provider-confirmed refund and updates net spend; it does not send money.</p><p className="mt-2 text-xs text-amber-900">Order total {formatCurrency(order.total)} · already recorded {formatCurrency(order.refundAmount)}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-amber-950">Refund amount (₹)<input type="number" min="0.01" max={Number(order.total) - Number(order.refundAmount)} step="0.01" value={refundValue} onChange={(event) => setRefundValue(event.target.value)} className="mt-1 block w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-amber-950">Provider refund reference<input value={refundReference} onChange={(event) => setRefundReference(event.target.value)} maxLength={120} className="mt-1 block w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" /></label></div><button disabled={refundBusy || !refundValue || !refundReference.trim()} onClick={recordRefund} className="mt-3 rounded-lg bg-amber-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{refundBusy ? "Saving…" : "Record provider-confirmed refund"}</button></section>}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-bold text-slate-700">Items</h2>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="text-xl">{item.imageEmoji}</span>
              <span className="flex-1">
                {item.name} × {item.quantity}
              </span>
              <span className="font-bold">{formatCurrency(Number(item.price) * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-bold text-slate-700">Delivery Address</h2>
        <p className="text-slate-600">
          {order.address.label} — {order.address.line1}, {order.address.city}, {order.address.state} - {order.address.pincode}
        </p>
        <p className="text-slate-500">📞 {order.address.phone}</p>
        <p className="mt-2 font-bold text-slate-900">Total: {formatCurrency(order.total)}</p>
      </div>
    </div>
  );
}
