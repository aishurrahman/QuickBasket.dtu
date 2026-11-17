"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { calculateDemoInstallments, formatCurrency, formatPreciseCurrency } from "@/lib/pricing";

type Data = {
  mode: "DEMO";
  targetSpend: number;
  historyDays: number;
  eligibility: {
    status: string; qualifyingSpend: number; amountRemaining: number; orderCount: number; firstQualifyingAt: string | null;
    daysComplete: number; daysRemaining: number; spendProgressPercent: number; timeProgressPercent: number; spendMet: boolean; timeMet: boolean;
  };
  review: null | { status: string; trustScore: number; reviewedAt: string; ruleSummary: { model?: string; formula?: string; meaning?: string } };
  partnerStatus: string;
  availableLimit: number | null;
  outstandingBalance: number | null;
  installments: unknown[];
  payments: { id: number; orderId: number; method: string; amount: string; status: string; createdAt: string }[];
  transactions: { id: number; total: string; refundAmount: string; status: string; paymentStatus: string; placedAt: string; deliveredAt: string | null }[];
};

type Budget = { perOrderLimit: number | null; weeklySpend: number; monthlySpend: number; personalizedTip: string };

export default function PayLaterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [principal, setPrincipal] = useState(3000);
  const [months, setMonths] = useState(3);

  const load = useCallback(async () => {
    const [paylaterResponse, budgetResponse] = await Promise.all([fetch("/api/paylater", { cache: "no-store" }), fetch("/api/budget", { cache: "no-store" })]);
    const [paylater, budgetData] = await Promise.all([paylaterResponse.json(), budgetResponse.json()]);
    if (!paylaterResponse.ok) throw new Error(paylater.error ?? "Could not load PayLater history");
    if (budgetResponse.ok) setBudget(budgetData);
    setData(paylater);
  }, []);

  useEffect(() => { if (!loading && !user) router.push("/login?next=/paylater"); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([fetch("/api/paylater", { cache: "no-store" }), fetch("/api/budget", { cache: "no-store" })])
      .then(async ([paylaterResponse, budgetResponse]) => {
        const [paylater, budgetData] = await Promise.all([paylaterResponse.json(), budgetResponse.json()]);
        if (!paylaterResponse.ok) throw new Error(paylater.error ?? "Could not load PayLater history");
        if (active) { setData(paylater); if (budgetResponse.ok) setBudget(budgetData); }
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Could not load PayLater history"); });
    return () => { active = false; };
  }, [user]);

  async function requestReview() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/paylater", { method: "POST" });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error ?? "Could not record review request");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record review request"); }
    finally { setBusy(false); }
  }

  if (loading || !user || !data) return <main className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-500">{error || "Loading PayLater…"}</main>;
  const e = data.eligibility;
  const calc = calculateDemoInstallments(principal, months);
  const exceedsBudget = budget?.perOrderLimit !== null && budget?.perOrderLimit !== undefined && calc.total > budget.perOrderLimit;
  const statusColor = data.review ? "bg-sky-100 text-sky-800" : e.status === "Eligible for EMI Review" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900";
  const dueDates = Array.from({ length: months }, (_, index) => {
    const due = new Date(); due.setMonth(due.getMonth() + index + 1);
    return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });

  return <main className="mx-auto max-w-4xl px-4 py-6">
    <header className="mb-4"><p className="text-xs font-extrabold tracking-widest text-amber-700">DEMO • NO REAL CREDIT</p><h1 className="text-2xl font-extrabold text-slate-800">QuickBasket PayLater</h1><p className="mt-1 text-sm text-slate-600">Build a qualifying order history and track review prerequisites. Meeting them does not guarantee lender approval.</p></header>
    {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

    <section className="rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-500">Eligibility status</p><h2 className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-extrabold ${statusColor}`}>{e.status}</h2><p className="mt-2 text-xs text-slate-500">Qualifying orders must be delivered; failed or fully refunded purchases do not count.</p></div><div className="text-right"><p className="text-sm text-slate-500">Qualifying net spend</p><p className="text-2xl font-extrabold text-slate-800">{formatCurrency(e.qualifyingSpend)} <span className="text-base font-semibold text-slate-500">/ {formatCurrency(data.targetSpend)}</span></p></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><div className="flex justify-between text-xs"><b className="text-slate-700">Spending target</b><span className="text-slate-500">{e.amountRemaining > 0 ? `${formatCurrency(e.amountRemaining)} remaining` : "Target reached"}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${e.spendProgressPercent}%` }} /></div></div>
        <div><div className="flex justify-between text-xs"><b className="text-slate-700">30-day history</b><span className="text-slate-500">{e.daysComplete}/{data.historyDays} days · {e.daysRemaining} remaining</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${e.timeProgressPercent}%` }} /></div><p className="mt-1 text-xs font-semibold text-slate-600">{e.spendMet && !e.timeMet ? "Waiting for 30 Days" : e.timeMet ? "30-day history complete" : "30-day countdown starts from your first qualifying delivery"}</p></div>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><p>Delivered qualifying orders: <b>{e.orderCount}</b></p><p>History started: <b>{e.firstQualifyingAt ? new Date(e.firstQualifyingAt).toLocaleDateString() : "After your first qualifying delivery"}</b></p></div>
      {data.review && <div className="mt-4 rounded-xl bg-sky-50 p-3 text-sm"><p className="font-bold text-sky-900">Under Review · DEMO only</p><p className="mt-1 text-xs text-sky-800">Demo TrustScore: {data.review.trustScore}/100. No lender has reviewed this account and no credit limit is available.</p><details className="mt-2 text-xs text-sky-900"><summary className="cursor-pointer font-semibold">How this demo score is calculated</summary><p className="mt-1">{data.review.ruleSummary.formula}</p><p className="mt-1">{data.review.ruleSummary.meaning}</p></details></div>}
      {!data.review && <button disabled={busy || e.status !== "Eligible for EMI Review"} onClick={requestReview} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Recording…" : e.status === "Eligible for EMI Review" ? "Request demo history review" : e.status}</button>}
    </section>

    <section className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Lending partner</p><p className="mt-1 font-bold text-slate-800">Not configured</p><p className="mt-2 text-xs text-slate-500">No real review, offer, or authorization is available.</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Verified credit limit</p><p className="mt-1 text-xl font-extrabold text-slate-800">—</p><p className="mt-2 text-xs text-slate-500">A limit appears only after a lender verifies it.</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">PayLater balance</p><p className="mt-1 text-xl font-extrabold text-slate-800">—</p><p className="mt-2 text-xs text-slate-500">No PayLater credit or installments exist.</p></div>
    </section>

    <section className="mt-4 rounded-xl border bg-white p-4"><h2 className="font-bold text-slate-800">Installment cost illustration</h2><p className="mt-1 text-xs text-slate-500">Educational DEMO estimate only: 12% simple annual interest and ₹99 fee. These are not lender-supported plans and cannot be selected at checkout.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Example principal (₹)<input type="number" min={100} max={100000} step={100} value={principal} onChange={(event) => setPrincipal(Math.max(100, Math.min(100000, Number(event.target.value))))} className="mt-1 block w-full rounded-lg border p-2" /></label><label className="text-sm">Example term<select value={months} onChange={(event) => setMonths(Number(event.target.value))} className="mt-1 block w-full rounded-lg border p-2"><option value={3}>3 months · illustration</option><option value={6}>6 months · illustration</option></select></label></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span>Principal</span><b className="text-right">{formatPreciseCurrency(calc.principal)}</b><span>Estimated interest</span><b className="text-right">{formatPreciseCurrency(calc.interest)}</b><span>Illustrative fee</span><b className="text-right">{formatPreciseCurrency(calc.fee)}</b><span className="font-bold">Illustrative total</span><b className="text-right">{formatPreciseCurrency(calc.total)}</b><span>Example due dates</span><b className="text-right">{dueDates.join(" · ")}</b><span>Example monthly payments</span><b className="text-right">{calc.schedule.map(formatPreciseCurrency).join(" · ")}</b></div>{exceedsBudget && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-800">This illustrative total ({formatCurrency(calc.total)}) is above your per-order grocery budget ({formatCurrency(budget!.perOrderLimit!)}). This estimate cannot be used to place an installment order.</p>}<Link href="/cart" className="mt-3 inline-block text-xs font-bold text-emerald-700 underline">Review your grocery budget</Link></section>

    <section className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border bg-white p-4"><h2 className="font-bold text-slate-800">Upcoming installments</h2><p className="mt-2 text-sm text-slate-500">None. No lender schedule is connected.</p></div><div className="rounded-xl border bg-white p-4"><h2 className="font-bold text-slate-800">Payment attempts</h2>{data.payments.length ? <ul className="mt-2 space-y-2">{data.payments.map((p) => <li key={p.id} className="flex justify-between border-b pb-2 text-sm"><span>Order #{p.orderId} · {p.method.toUpperCase()}<small className="block text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</small></span><span className="text-right">{formatPreciseCurrency(p.amount)}<small className="block capitalize text-slate-500">{p.status}</small></span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No payment attempts recorded.</p>}</div><div className="rounded-xl border bg-white p-4 sm:col-span-2"><h2 className="font-bold text-slate-800">Delivered order and refund history</h2>{data.transactions.length ? <ul className="mt-2 space-y-2">{data.transactions.map((t) => <li key={t.id} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm"><span>Order #{t.id}<small className="block capitalize text-slate-500">{t.status} · payment {t.paymentStatus}{t.deliveredAt ? ` · delivered ${new Date(t.deliveredAt).toLocaleDateString()}` : ""}</small></span><span className="text-right">{formatCurrency(t.total)}<small className="block text-slate-500">Refunded {formatCurrency(t.refundAmount)}</small></span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No order history yet.</p>}</div></section>
  </main>;
}
