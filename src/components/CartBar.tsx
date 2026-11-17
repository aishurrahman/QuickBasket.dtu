"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/pricing";

export function CartBar() {
  const { itemCount, totals } = useCart();
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;
  if (pathname === "/cart" || pathname === "/checkout") return null;
  if (itemCount === 0) return null;

  return (
    <div className="motion-cart-bar fixed inset-x-0 bottom-0 z-40 border-t border-emerald-800 bg-emerald-700 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.15)]">
      <Link href="/cart" className="mx-auto flex max-w-6xl items-center justify-between px-2 text-white">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-white/15 px-2 py-1 text-sm font-bold">{itemCount} item{itemCount > 1 ? "s" : ""}</span>
          <span className="font-extrabold">{formatCurrency(totals.total)}</span>
        </div>
        <span className="flex items-center gap-1 font-bold">
          View Cart <span aria-hidden>→</span>
        </span>
      </Link>
    </div>
  );
}
