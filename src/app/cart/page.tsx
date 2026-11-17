"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { QtyStepper } from "@/components/QtyStepper";
import { BudgetGuard } from "@/components/BudgetGuard";
import { formatCurrency, PRICING_CONFIG } from "@/lib/pricing";

export default function CartPage() {
  const { items, totals, updateQuantity, coupon, setCoupon, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [couponInput, setCouponInput] = useState(coupon?.code ?? "");
  const [applying, setApplying] = useState(false);
  const [couponError, setCouponError] = useState("");

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setApplying(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput.trim(),
          items: items.map((i) => ({ price: i.price, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error ?? "Could not apply coupon");
        setCoupon(null);
        return;
      }
      setCoupon({
        code: data.coupon.code,
        discountType: data.coupon.discountType,
        discountValue: data.coupon.discountValue,
        minOrderValue: data.coupon.minOrderValue,
        maxDiscount: data.coupon.maxDiscount,
      });
      showToast(`Coupon ${data.coupon.code} applied! You saved ${formatCurrency(data.totals.discount)}`, "success");
    } catch {
      setCouponError("Something went wrong. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  function handleCheckout() {
    if (items.length === 0) {
      showToast("Your cart is empty. Add items before checking out.", "error");
      return;
    }
    if (!user) {
      showToast("Please log in to continue to checkout", "info");
      router.push("/login?next=/checkout");
      return;
    }
    router.push("/checkout");
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-6xl">🛒</p>
        <h1 className="mt-4 text-xl font-extrabold text-slate-800">Your cart is empty</h1>
        <p className="mt-2 text-slate-500">Looks like you haven&apos;t added anything yet. Let&apos;s fix that!</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700">
          Start Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-extrabold text-slate-800">Your Cart</h1>

      {totals.freeDeliveryRemaining > 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
          Add {formatCurrency(totals.freeDeliveryRemaining)} more to get FREE delivery!
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-3 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-3xl">
              {item.imageEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
              <p className="text-xs text-slate-500">{item.unit}</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(item.price)}</p>
            </div>
            <div className="w-28 shrink-0">
              <QtyStepper
                quantity={item.quantity}
                stock={item.stock}
                onAdd={() => updateQuantity(item.productId, 1)}
                onIncrement={() => updateQuantity(item.productId, item.quantity + 1)}
                onDecrement={() => updateQuantity(item.productId, item.quantity - 1)}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4"><BudgetGuard /></div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-slate-700">Have a coupon?</p>
        <div className="flex gap-2">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="e.g. WELCOME50"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500"
          />
          <button
            onClick={applyCoupon}
            disabled={applying}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {applying ? "Applying..." : "Apply"}
          </button>
        </div>
        {couponError && <p className="mt-2 text-xs font-semibold text-rose-600">{couponError}</p>}
        {coupon && !couponError && (
          <p className="mt-2 flex items-center justify-between text-xs font-semibold text-emerald-700">
            ✓ {coupon.code} applied
            <button
              onClick={() => {
                setCoupon(null);
                setCouponInput("");
              }}
              className="text-slate-400 underline"
            >
              Remove
            </button>
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-slate-700">Bill Summary</p>
        <div className="space-y-1.5 text-sm text-slate-600">
          <Row label="Item total" value={formatCurrency(totals.subtotal)} />
          <Row
            label="Delivery fee"
            value={totals.deliveryFee === 0 ? "FREE" : formatCurrency(totals.deliveryFee)}
            highlight={totals.deliveryFee === 0}
          />
          <Row label="Handling fee" value={formatCurrency(totals.handlingFee)} />
          {totals.discount > 0 && <Row label="Coupon discount" value={`− ${formatCurrency(totals.discount)}`} highlight />}
          <div className="my-2 border-t border-dashed border-slate-200" />
          <Row label="To Pay" value={formatCurrency(totals.total)} bold />
        </div>
      </div>

      <button
        onClick={handleCheckout}
        className="mt-5 w-full rounded-xl bg-emerald-600 py-3.5 text-center font-extrabold text-white shadow-md hover:bg-emerald-700"
      >
        Proceed to Checkout · {formatCurrency(totals.total)}
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">
        Estimated delivery: ~{PRICING_CONFIG.etaMinutes} minutes after confirmation (illustrative, not guaranteed)
      </p>
      <button onClick={clearCart} className="mt-3 w-full text-center text-xs font-semibold text-slate-400 underline">
        Clear cart
      </button>
    </main>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-extrabold text-slate-900" : ""}`}>
      <span className={highlight ? "font-semibold text-emerald-700" : ""}>{label}</span>
      <span className={highlight ? "font-semibold text-emerald-700" : ""}>{value}</span>
    </div>
  );
}
