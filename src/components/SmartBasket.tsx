"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/pricing";

type Suggestion = { productId: number; name: string; unit: string; price: number; imageEmoji: string | null; stock: number; quantity: number; reason: string; predicted: boolean };
export function SmartBasket() {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!user || authLoading) return;
    fetch("/api/smart-basket").then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setItems(d.recommendations); setQuantities(Object.fromEntries(d.recommendations.map((x: Suggestion) => [x.productId, x.quantity]))); }).catch((e) => setError(e.message || "Could not load suggestions")).finally(() => setLoading(false));
  }, [user, authLoading]);
  async function dismiss(item: Suggestion) {
    await fetch("/api/smart-basket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismissed", items: [{ productId: item.productId }] }) });
    setItems((prev) => prev.filter((x) => x.productId !== item.productId));
  }
  async function addSelected() {
    const selected = items.map((item) => ({ productId: item.productId, quantity: Math.min(quantities[item.productId] || 1, item.stock), feedback: (quantities[item.productId] || 1) === item.quantity ? "accepted" : "edited" }));
    if (!selected.length) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/smart-basket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", items: selected }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      for (const p of data.products) { const qty = selected.find((x) => x.productId === p.productId)?.quantity ?? 1; addItem({ ...p }, qty); }
      setMessage("Selected items added to your cart.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add suggestions"); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-6xl px-4 py-5" aria-labelledby="smart-basket-title">
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Personalized reorder helper</p><h2 id="smart-basket-title" className="mt-1 text-lg font-extrabold text-slate-800">🧠 Smart Basket</h2><p className="mt-1 text-sm text-slate-600">Transparent reorder suggestions based on purchase intervals. No machine learning model is running.</p></div>{items.length > 0 && <button disabled={busy} onClick={addSelected} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Adding…" : "Add selected"}</button>}</div>
      {authLoading ? <p className="mt-4 text-sm text-slate-500">Checking account…</p> : !user ? <p className="mt-4 text-sm text-slate-600"><a href="/login" className="font-bold text-emerald-700 underline">Sign in</a> to see personalized reorder suggestions.</p> : loading ? <p className="mt-4 text-sm text-slate-500">Finding reorder suggestions…</p> : error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> : items.length === 0 ? <p className="mt-4 text-sm text-slate-500">No available suggestions right now.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map((item) => <article key={item.productId} className="rounded-xl border border-white bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-2"><span className="text-2xl" aria-hidden="true">{item.imageEmoji}</span><button onClick={() => dismiss(item)} aria-label={`Dismiss ${item.name}`} className="text-xs text-slate-500 underline">Dismiss</button></div><h3 className="mt-2 font-bold text-slate-800">{item.name}</h3><p className="text-xs text-slate-500">{item.reason}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-bold text-emerald-700">{formatCurrency(item.price)}</span><label className="flex items-center gap-1 text-xs text-slate-600">Qty <input aria-label={`Quantity for ${item.name}`} type="number" min={1} max={item.stock} value={quantities[item.productId] || 1} onChange={(e) => setQuantities((q) => ({ ...q, [item.productId]: Math.min(item.stock, Math.max(1, Number(e.target.value))) }))} className="w-14 rounded border px-2 py-1" /></label></div></article>)}</div>}
      {message && <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
    </div>
  </section>;
}
