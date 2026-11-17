import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "📊 Dashboard" },
  { href: "/admin/products", label: "🛍️ Products" },
  { href: "/admin/categories", label: "🗂️ Categories" },
  { href: "/admin/orders", label: "📦 Orders" },
  { href: "/admin/coupons", label: "🏷️ Coupons" },
  { href: "/admin/pincodes", label: "📍 Pincodes" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen flex-col sm:flex-row">
        <aside className="shrink-0 border-b border-slate-200 bg-slate-900 p-4 text-white sm:w-56 sm:border-b-0 sm:border-r">
          <Link href="/" className="mb-6 flex items-center gap-2">
            <span className="text-2xl">🧺</span>
            <span className="font-extrabold">QuickBasket Admin</span>
          </Link>
          <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-400">Signed in as</p>
            <p className="text-sm font-bold">{session.name}</p>
            <AdminLogoutButton />
          </div>
        </aside>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
