"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/pricing";

type BudgetSummary = { perOrderLimit: number | null; weeklySpend: number; monthlySpend: number; personalizedTip: string };
type Alternative = { productId: number; name: string; unit: string; imageEmoji: string | null; price: number; mrp: number; stock: number; saving: number };
type Suggestion = { sourceProductId: number; sourceName: string; quantity: number; alternatives: Alternative[] };

export function BudgetGuard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { items, totals, coupon, addItem, removeItem } = useCart();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [limitInput, setLimitInput] = useState("");
  const [preview, setPreview] = useState<{ basketKey: string; total: number; remaining: number | null; overBudget: boolean } | null>(null);
  const [suggestionResult, setSuggestionResult] = useState<{ basketKey: string; suggestions: Suggestion[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const basketKey = JSON.stringify(items.map(({ productId, quantity }) => ({ productId, quantity })));
  const currentPreview = preview?.basketKey === basketKey ? preview : null;
  const currentSuggestions = suggestionResult?.basketKey === basketKey ? suggestionResult.suggestions : [];
  const overBudget = currentPreview?.overBudget === true;

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch("/api/budget", { cache: "no-store" }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Could not load budget");
      if (active) { setSummary(data); setLimitInput(data.perOrderLimit === null ? "" : String(data.perOrderLimit)); }
    }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Could not load budget"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !items.length) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/budget/preview", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ items: items.map(({ productId, quantity }) => ({ productId, quantity })), couponCode: coupon?.code }),
        });
        const data = await response.json();
        if (response.ok) setPreview({ basketKey, total: data.total, remaining: data.remaining, overBudget: data.overBudget });
        else setError(data.error ?? "Could not calculate the current basket");
      } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setError("Could not calculate the current basket"); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [user, items, coupon, basketKey]);

  useEffect(() => {
    if (!user || !overBudget || !items.length) return;
    const controller = new AbortController();
    fetch("/api/budget/suggestions", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ items: JSON.parse(basketKey) }),
    }).then((r) => r.json()).then((data) => { if (!controller.signal.aborted) setSuggestionResult({ basketKey, suggestions: data.alternatives ?? [] }); })
      .catch(() => { if (!controller.signal.aborted) setSuggestionResult({ basketKey, suggestions: [] }); });
    return () => controller.abort();
  }, [user, items.length, basketKey, overBudget]);

  async function saveBudget(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const value = limitInput.trim() ? Number(limitInput) : null;
    if (value !== null && (!Number.isFinite(value) || value < 100 || value > 100000)) {
      setError("Enter an order budget from ₹100 to ₹100,000."); setSaving(false); return;
    }
    try {
      const r = await fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ perOrderLimit: value }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Could not save your budget");
      setSummary((current) => current ? { ...current, perOrderLimit: data.perOrderLimit } : current);
      setLimitInput(data.perOrderLimit === null ? "" : String(data.perOrderLimit));
      setMessage(data.perOrderLimit === null ? "Order budget cleared." : "Your order budget is saved to your account.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your budget"); }
    finally { setSaving(false); }
  }

  function approveSwap(sourceProductId: number, quantity: number, alternative: Alternative) {
    addItem({ productId: alternative.productId, name: alternative.name, unit: alternative.unit, imageEmoji: alternative.imageEmoji ?? "🛒", price: alternative.price, mrp: alternative.mrp, stock: alternative.stock }, quantity);
    removeItem(sourceProductId);
    setMessage(`You approved replacing ${currentSuggestions.find((s) => s.sourceProductId === sourceProductId)?.sourceName ?? "the item"} with ${alternative.name}.`);
  }

  if (!user) return <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"><h2 className="font-extrabold text-slate-800">🛡️ Budget Guard</h2><p className="mt-1 text-sm text-slate-600">Sign in to save an order budget and track weekly and monthly delivered-order spending.</p><Link href="/login?next=/cart" className="mt-3 inline-block text-sm font-bold text-emerald-700 underline">Sign in</Link></section>;

  return <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4" aria-labelledby="budget-guard-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Your spending tools</p><h2 id="budget-guard-title" className="mt-1 font-extrabold text-slate-800">🛡️ Budget Guard</h2><p className="mt-1 text-sm text-slate-600">Your budget is a personal warning. You stay in control of every basket change.</p></div>
      {!compact && summary && <div className="grid grid-cols-2 gap-2 text-right text-xs"><div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-500">This week</span><b className="text-slate-800">{formatCurrency(summary.weeklySpend)}</b></div><div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-500">This month</span><b className="text-slate-800">{formatCurrency(summary.monthlySpend)}</b></div></div>}
    </div>
    <form onSubmit={saveBudget} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="min-w-44 flex-1 text-xs font-semibold text-slate-600">Per-order budget (₹)<input type="number" min="100" max="100000" step="1" value={limitInput} onChange={(e) => setLimitInput(e.target.value)} placeholder="Set a limit" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
      <button disabled={saving || loading} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save budget"}</button>
      {summary?.perOrderLimit !== null && summary?.perOrderLimit !== undefined && <button type="button" disabled={saving} onClick={() => { setLimitInput(""); void fetch("/api/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ perOrderLimit: null }) }).then((r) => { if (r.ok) setSummary((current) => current ? { ...current, perOrderLimit: null } : current); }); }} className="px-2 py-2 text-xs text-slate-500 underline">Clear</button>}
    </form>
    {summary?.perOrderLimit !== null && summary?.perOrderLimit !== undefined && <div className="mt-3 rounded-xl bg-white p-3 text-sm">
      <div className="flex justify-between gap-2"><span className="text-slate-600">Server-calculated basket</span><b>{formatCurrency(currentPreview?.total ?? totals.total)}</b></div>
      <div className="mt-1 flex justify-between gap-2"><span className="text-slate-600">Budget remaining</span><b className={(overBudget ? "text-rose-700" : "text-emerald-700")}>{currentPreview?.remaining === null || currentPreview?.remaining === undefined ? "Checking…" : formatCurrency(currentPreview.remaining)}</b></div>
      {!compact && <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100"><div className={`h-full rounded ${overBudget ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.round((currentPreview?.total ?? totals.total) / summary.perOrderLimit * 100))}%` }} /></div>}
      {overBudget && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">This basket is over your budget. Checkout will ask you to review and confirm before placing the order.</p>}
    </div>}
    {!compact && <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600"><b className="text-slate-800">Spending summary</b><p className="mt-1">{loading ? "Loading your spending…" : summary ? summary.personalizedTip : "Set a budget and your spending summary will appear here."}</p></div>}
    {overBudget && currentSuggestions.some((s) => s.alternatives.length > 0) && <div className="mt-3 rounded-xl bg-white p-3"><h3 className="text-sm font-bold text-slate-800">Cheaper alternatives</h3><p className="mt-1 text-xs text-slate-500">Choose each replacement yourself; nothing changes until you approve it.</p><div className="mt-2 space-y-2">{currentSuggestions.filter((s) => s.alternatives.length > 0).map((s) => <div key={s.sourceProductId} className="rounded-lg border border-slate-100 p-2"><p className="text-xs font-semibold text-slate-700">Replace {s.sourceName}?</p><div className="mt-1 flex flex-wrap gap-2">{s.alternatives.map((a) => <button key={a.productId} type="button" onClick={() => approveSwap(s.sourceProductId, s.quantity, a)} className="rounded-lg border border-emerald-200 px-2 py-1 text-left text-xs hover:bg-emerald-50">{a.imageEmoji} {a.name} · {formatCurrency(a.price)} · save {formatCurrency(a.saving)}</button>)}</div></div>)}</div></div>}
    {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
    {message && <p role="status" className="mt-2 text-xs font-semibold text-emerald-700">{message}</p>}
  </section>;
}
