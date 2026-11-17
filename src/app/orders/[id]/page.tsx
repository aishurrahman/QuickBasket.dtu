"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, STATUS_LABELS, type OrderStatus } from "@/lib/pricing";
import { StatusTimeline } from "@/components/StatusTimeline";
import { EtaCountdown } from "@/components/EtaCountdown";

type OrderDetail = {
  id: number;
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  handlingFee: string;
  discount: string;
  total: string;
  refundAmount: string;
  couponCode: string | null;
  paymentMethod: string;
  paymentStatus: string;
  etaMinutes: number;
  placedAt: string;
  address: { label: string; line1: string; line2?: string; city: string; state: string; pincode: string; phone: string };
  items: { id: number; name: string; unit: string; imageEmoji: string | null; price: string; quantity: number }[];
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  async function simulatePayment(outcome: "success" | "failed" | "cancelled") {
    setPaymentBusy(true); setPaymentMessage("");
    try {
      const res = await fetch(`/api/orders/${id}/simulate-payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Simulation failed");
      setOrder((current) => current ? { ...current, paymentStatus: data.order.paymentStatus, status: data.order.status } : current);
      setPaymentMessage(data.repeated ? "That result was already recorded." : `Development simulation recorded: ${outcome}.`);
    } catch (e) { setPaymentMessage(e instanceof Error ? e.message : "Simulation failed"); }
    finally { setPaymentBusy(false); }
  }

  useEffect(() => {
    if (!loading && !user) router.push(`/login?next=/orders/${id}`);
  }, [loading, user, router, id]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/orders/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setOrder(data.order);
      })
      .catch((e) => setError(e.message ?? "Could not load order"));
  }, [id, user]);

  if (loading || (!order && !error)) {
    return <main className="px-4 py-16 text-center text-slate-400">Loading order...</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-5xl">😕</p>
        <h1 className="mt-4 text-lg font-bold text-slate-800">{error}</h1>
        <Link href="/orders" className="mt-4 inline-block font-bold text-emerald-700 underline">
          Back to orders
        </Link>
      </main>
    );
  }

  if (!order) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/orders" className="text-sm font-semibold text-slate-500 hover:underline">
        ← Back to orders
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800">Order #{order.id}</h1>
        <span className="text-xs text-slate-400">{new Date(order.placedAt).toLocaleString()}</span>
      </div>

      <div className="mt-4">
        <EtaCountdown placedAt={order.placedAt} etaMinutes={order.etaMinutes} status={order.status} />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <StatusTimeline status={order.status} />
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold text-slate-700">Payment</h2>
        <p className="mt-1 text-sm text-slate-600">{order.paymentMethod.toUpperCase()} · <span className="capitalize">{order.paymentStatus}</span> · {formatCurrency(order.total)}</p>
        {order.paymentStatus === "pending" && order.paymentMethod !== "cod" && <div className="mt-3 rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-900">DEVELOPMENT SIMULATOR: no real payment provider is connected. Choose a test outcome below.</p><div className="mt-2 flex flex-wrap gap-2">{(["success", "failed", "cancelled"] as const).map((outcome) => <button key={outcome} disabled={paymentBusy} onClick={() => simulatePayment(outcome)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold capitalize disabled:opacity-50">{outcome}</button>)}</div></div>}
        {paymentMessage && <p role="status" className="mt-2 text-xs text-slate-600">{paymentMessage}</p>}
      </section>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-bold text-slate-700">Items</h2>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-2xl">{item.imageEmoji}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-400">
                  {item.unit} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(item.price) * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-bold text-slate-700">Delivery Address</h2>
        <p className="text-sm text-slate-600">
          <b>{order.address.label}</b> — {order.address.line1}
          {order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} -{" "}
          {order.address.pincode}
        </p>
        <p className="text-sm text-slate-500">📞 {order.address.phone}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-bold text-slate-700">Bill Details</h2>
        <div className="space-y-1.5 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Item total</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery fee</span>
            <span>{Number(order.deliveryFee) === 0 ? "FREE" : formatCurrency(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Handling fee</span>
            <span>{formatCurrency(order.handlingFee)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Coupon ({order.couponCode})</span>
              <span>− {formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="my-2 border-t border-dashed border-slate-200" />
          <div className="flex justify-between text-base font-extrabold text-slate-900">
            <span>Total Paid</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          {Number(order.refundAmount) > 0 && <div className="flex justify-between text-emerald-700"><span>Confirmed refunds</span><span>− {formatCurrency(order.refundAmount)}</span></div>}
          <p className="pt-1 text-xs text-slate-400">
            Payment method: {order.paymentMethod.toUpperCase()} · Status: {STATUS_LABELS[order.status]}
          </p>
        </div>
      </div>
    </main>
  );
}
