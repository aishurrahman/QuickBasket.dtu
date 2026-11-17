"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

export function Header() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname.startsWith("/admin")) return null;

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  async function handleLogout() {
    await logout();
    showToast("Logged out successfully", "success");
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <header className="motion-header sticky top-0 z-40 border-b border-emerald-100/80 bg-white/90 backdrop-blur-xl">
      <div className="motion-header-glint" aria-hidden="true" />
      <div className="motion-header-content mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="motion-brand flex shrink-0 items-center gap-2">
          <span className="motion-brand-icon text-2xl" aria-hidden="true">🧺</span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight text-emerald-700">QuickBasket</p>
            <p className="motion-tagline text-[11px] font-semibold text-slate-500">Delivery in ~10 minutes</p>
          </div>
        </Link>

        <form onSubmit={handleSearch} className="order-3 w-full flex-1 sm:order-none sm:w-auto">
          <div className="motion-search flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2">
            <span className="motion-search-icon" aria-hidden="true">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for atta, milk, chips..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <span className="motion-search-hint hidden text-[10px] font-semibold text-slate-400 sm:inline">Enter ↵</span>
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="motion-header-action flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                👤 {user.name.split(" ")[0]}
              </button>
              {menuOpen && (
                <div className="motion-user-menu absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                  <Link href="/orders" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    📦 My Orders
                  </Link>
                  <Link href="/budget" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    🛡️ Budget Guard
                  </Link>
                  <Link href="/paylater" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    💳 PayLater (DEMO)
                  </Link>
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    ⚙️ Account
                  </Link>
                  {user.role === "admin" && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                      🛠️ Admin Panel
                    </Link>
                  )}
                  <button onClick={handleLogout} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
                    ↩️ Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="motion-header-action rounded-lg border border-emerald-600 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
              Login
            </Link>
          )}

          <Link
            href="/cart"
            className="motion-cart-button relative flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <span className="motion-cart-icon" aria-hidden="true">🛒</span> Cart
            {itemCount > 0 && (
              <span key={itemCount} className="motion-cart-count absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-extrabold text-slate-900">
                {itemCount}
              </span>
            )}
          </Link>
          <Link
            href="/paylater"
            className="motion-header-action flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100"
          >
            <span aria-hidden="true">💳</span>
            <span>Pay Later</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
