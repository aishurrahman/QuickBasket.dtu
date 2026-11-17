import Link from "next/link";

export function Footer() {
  return (
    <footer className="motion-rise-in border-t border-emerald-100 bg-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="motion-brand-icon text-2xl" aria-hidden="true">🧺</span>
          <div>
            <h2 className="text-sm font-extrabold text-emerald-800">About QuickBasket</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
              Your neighborhood grocery shop online, with simple tools to help you plan your basket and track your budget.
            </p>
          </div>
        </div>
        <Link
          href="/paylater"
          className="w-fit text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
        >
          Explore Pay Later →
        </Link>
      </div>
    </footer>
  );
}
