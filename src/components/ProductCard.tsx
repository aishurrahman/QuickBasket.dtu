"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/pricing";
import { QtyStepper } from "@/components/QtyStepper";

export type ProductCardData = {
  id: number;
  name: string;
  slug: string;
  unit: string;
  imageEmoji: string | null;
  mrp: string;
  price: string;
  stock: number;
  isActive: boolean;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const { getQuantity, addItem, updateQuantity } = useCart();
  const qty = getQuantity(product.id);
  const price = Number(product.price);
  const mrp = Number(product.mrp);
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <div className="motion-product-card group flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative mb-2 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-slate-50 text-5xl">
          <span className="motion-product-emoji inline-block transition-transform duration-300 group-hover:scale-110">
            {product.imageEmoji ?? "🛍️"}
          </span>
          {discountPct > 0 && (
            <span className="absolute left-1 top-1 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {discountPct}% OFF
            </span>
          )}
        </div>
        <p className="text-[11px] font-medium text-slate-500">{product.unit}</p>
        <h3 className="mb-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800">{product.name}</h3>
      </Link>
      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="text-sm font-bold text-slate-900">{formatCurrency(price)}</span>
        {discountPct > 0 && <span className="text-xs text-slate-400 line-through">{formatCurrency(mrp)}</span>}
      </div>
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
        size="sm"
      />
    </div>
  );
}
