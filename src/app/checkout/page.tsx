"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { BudgetGuard } from "@/components/BudgetGuard";
import { formatCurrency } from "@/lib/pricing";

type Address = {
  id: number;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
};

export default function CheckoutPage() {
  const { items, totals, coupon, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", line1: "", line2: "", city: "", state: "", pincode: "", phone: "" });
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi" | "card">("cod");
  const [placing, setPlacing] = useState(false);
  const requestKey = useRef("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?next=/checkout");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (items.length === 0) router.push("/cart");
  }, [items, router]);

  useEffect(() => {
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => {
        const list: Address[] = data.addresses ?? [];
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) setSelectedId(def.id);
        else setShowNewForm(true);
      })
      .catch(() => setShowNewForm(true));
  }, []);

  async function checkPincode(pincode: string) {
    if (pincode.length < 4) return;
    setPincodeStatus("checking");
    try {
      const res = await fetch(`/api/pincodes?check=${pincode}`);
      const data = await res.json();
      setPincodeStatus(data.deliverable ? "ok" : "fail");
    } catch {
      setPincodeStatus("idle");
    }
  }

  async function saveAddress() {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, isDefault: addresses.length === 0 }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Could not save address", "error");
      return null;
    }
    setAddresses((prev) => [...prev, data.address]);
    setSelectedId(data.address.id);
    setShowNewForm(false);
    return data.address as Address;
  }

  async function placeOrder() {
    if (items.length === 0) {
      showToast("Your cart is empty.", "error");
      router.push("/cart");
      return;
    }

    let address = addresses.find((a) => a.id === selectedId) ?? null;

    if (showNewForm || !address) {
      if (!form.line1 || !form.city || !form.state || !form.pincode || !form.phone) {
        showToast("Please fill in all address fields", "error");
        return;
      }
      address = await saveAddress();
      if (!address) return;
    }

    setPlacing(true);
    try {
      if (!requestKey.current) requestKey.current = crypto.randomUUID();
      let budgetAcknowledged = false;
      let data: { order: { id: number }; error?: string; code?: string; budgetLimit?: number; orderTotal?: number };
      while (true) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            address: {
              label: address!.label,
              line1: address!.line1,
              line2: address!.line2 ?? "",
              city: address!.city,
              state: address!.state,
              pincode: address!.pincode,
              phone: address!.phone,
            },
            couponCode: coupon?.code,
            paymentMethod,
            idempotencyKey: requestKey.current,
            budgetAcknowledged,
          }),
        });
        data = await res.json();
        if (!res.ok && data.code === "BUDGET_EXCEEDED") {
          const proceed = window.confirm(`This order total (${formatCurrency(data.orderTotal ?? totals.total)}) is above your saved budget (${formatCurrency(data.budgetLimit ?? 0)}). Continue anyway?`);
          if (proceed) { budgetAcknowledged = true; continue; }
          return;
        }
        if (!res.ok) { showToast(data.error ?? "Could not place order", "error"); return; }
        break;
      }
      clearCart();
      showToast("Order placed successfully! 🎉", "success");
      router.push(`/orders/${data.order.id}`);
    } catch {
      showToast("Could not place your order. Please try again.", "error");
    } finally {
      setPlacing(false);
    }
  }

  if (authLoading || items.length === 0) {
    return <main className="px-4 py-16 text-center text-slate-400">Loading...</main>;
  }

  const paymentMethods = ["cod", "upi", "card"] as const;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-extrabold text-slate-800">Checkout</h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold text-slate-700">Delivery Address</h2>

        {addresses.length > 0 && (
          <div className="mb-3 space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                  selectedId === a.id && !showNewForm ? "border-emerald-500 bg-emerald-50" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  checked={selectedId === a.id && !showNewForm}
                  onChange={() => {
                    setSelectedId(a.id);
                    setShowNewForm(false);
                  }}
                  className="mt-1"
                />
                <div>
                  <p className="font-bold text-slate-800">{a.label}</p>
                  <p className="text-slate-600">
                    {a.line1}, {a.line2 ? `${a.line2}, ` : ""}
                    {a.city}, {a.state} - {a.pincode}
                  </p>
                  <p className="text-slate-500">📞 {a.phone}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {!showNewForm && (
          <button onClick={() => setShowNewForm(true)} className="text-sm font-bold text-emerald-700 underline">
            + Add a new address
          </button>
        )}

        {showNewForm && (
          <div className="mt-3 space-y-3 rounded-xl border border-dashed border-slate-300 p-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Label (Home/Work)"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
              />
              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
              />
              <input
                placeholder="Address line 1 (House no, street)"
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Address line 2 (optional)"
                value={form.line2}
                onChange={(e) => setForm({ ...form, line2: e.target.value })}
                className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="col-span-2">
                <input
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => {
                    setForm({ ...form, pincode: e.target.value });
                    checkPincode(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {pincodeStatus === "checking" && <p className="mt-1 text-xs text-slate-400">Checking deliverability...</p>}
                {pincodeStatus === "ok" && <p className="mt-1 text-xs font-semibold text-emerald-600">✓ We deliver to this area</p>}
                {pincodeStatus === "fail" && (
                  <p className="mt-1 text-xs font-semibold text-amber-600">⚠ Outside our usual zones — we&apos;ll still try our best!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold text-slate-700">Payment Method</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {paymentMethods.map((pm) => (
            <button
              key={pm}
              onClick={() => setPaymentMethod(pm)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-bold ${
                paymentMethod === pm ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
              }`}
            >
                {pm === "cod" ? "💵 Cash on Delivery" : pm === "upi" ? "📱 UPI (demo)" : "💳 Card (demo)"}
            </button>
          ))}
          <button type="button" disabled aria-disabled="true" className="col-span-full cursor-not-allowed rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm font-bold text-slate-400">🗓️ QuickBasket PayLater — Order Now, Pay Later <span className="ml-1 text-xs font-medium">Unavailable · DEMO mode</span></button>
        </div>
        <p className="mt-2 text-xs text-slate-500">UPI and card require a payment provider, which is not configured. Checkout records them as pending; it never marks them paid automatically.</p>
        <p className="mt-2 text-xs text-amber-800">No lending partner is connected, so no installment plan is offered. <Link href="/paylater" className="font-bold underline">View eligibility progress</Link>.</p>
      </section>

      <div className="mt-4"><BudgetGuard compact /></div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold text-slate-700">Order Summary</h2>
        <div className="space-y-1.5 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Item total</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery fee</span>
            <span>{totals.deliveryFee === 0 ? "FREE" : formatCurrency(totals.deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Handling fee</span>
            <span>{formatCurrency(totals.handlingFee)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Coupon ({coupon?.code})</span>
              <span>− {formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="my-2 border-t border-dashed border-slate-200" />
          <div className="flex justify-between text-base font-extrabold text-slate-900">
            <span>To Pay</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </section>

      <button
        onClick={placeOrder}
        disabled={placing}
        className="mt-5 w-full rounded-xl bg-emerald-600 py-3.5 text-center font-extrabold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60"
      >
        {placing ? "Placing order..." : `Place Order · ${formatCurrency(totals.total)}`}
      </button>
    </main>
  );
}
