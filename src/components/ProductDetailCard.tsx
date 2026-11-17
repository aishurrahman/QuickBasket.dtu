"use client";

import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/pricing";
import { QtyStepper } from "@/components/QtyStepper";
import type { products } from "@/db/schema";

export function ProductDetailCard({ product }: { product: typeof products.$inferSelect }) {
  const { getQuantity, addItem, updateQuantity } = useCart();
  const qty = getQuantity(product.id);
  const price = Number(product.price);
  const mrp = Number(product.mrp);
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-[7rem]">
        {product.imageEmoji ?? "🛍️"}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500">{product.unit}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{product.name}</h1>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(price)}</span>
          {discountPct > 0 && (
            <>
              <span className="text-slate-400 line-through">{formatCurrency(mrp)}</span>
              <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">{discountPct}% OFF</span>
            </>
          )}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{product.description}</p>
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          {product.stock > 0 ? `✓ In stock (${product.stock} available)` : "Out of stock"}
        </p>

        <div className="mt-6 max-w-xs">
          <QtyStepper
            quantity={qty}
            stock={product.stock}
            onAdd={() =>
              addItem(
                {
                  productId: product.id,
                  name: product.name,
                  price,
                  mrp,
                  unit: product.unit,
                  imageEmoji: product.imageEmoji ?? "🛍️",
                  stock: product.stock,
                },
                1,
              )
            }
            onIncrement={() => updateQuantity(product.id, qty + 1)}
            onDecrement={() => updateQuantity(product.id, qty - 1)}
          />
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs font-semibold text-slate-600">
          <div className="rounded-lg bg-slate-50 p-3">⚡ ~10 min delivery</div>
          <div className="rounded-lg bg-slate-50 p-3">↩️ Easy returns</div>
          <div className="rounded-lg bg-slate-50 p-3">🔒 Secure checkout</div>
        </div>
      </div>
    </div>
  );
}
