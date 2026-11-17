"use client";

import { useEffect, useState, FormEvent } from "react";
import { useToast } from "@/context/ToastContext";
import { formatCurrency } from "@/lib/pricing";

type Coupon = {
  id: number;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: string;
  minOrderValue: string;
  maxDiscount: string | null;
  isActive: boolean;
};

const emptyForm = { code: "", description: "", discountType: "flat", discountValue: "", minOrderValue: "0", maxDiscount: "" };

export default function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const data = await fetch("/api/coupons").then((r) => r.json());
    setCoupons(data.coupons ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/coupons")
      .then((r) => r.json())
      .then((data) => {
        if (active) setCoupons(data.coupons ?? []);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue || 0),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Could not create coupon", "error");
      return;
    }
    showToast("Coupon created", "success");
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function toggleActive(c: Coupon) {
    await fetch(`/api/coupons/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    showToast("Coupon deleted", "success");
    load();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Coupons</h1>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
          {showForm ? "Cancel" : "+ Add Coupon"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input
            required
            placeholder="Code (e.g. SAVE20)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="flat">Flat amount off</option>
            <option value="percent">Percentage off</option>
          </select>
          <input
            required
            type="number"
            placeholder="Discount value"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Min order value"
            value={form.minOrderValue}
            onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Max discount (for %)"
            value={form.maxDiscount}
            onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="col-span-2 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            Save Coupon
          </button>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {coupons.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-emerald-700">{c.code}</p>
              <button
                onClick={() => toggleActive(c)}
                className={`rounded-full px-2 py-1 text-xs font-bold ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
              >
                {c.isActive ? "Active" : "Inactive"}
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-600">{c.description}</p>
            <p className="mt-1 text-sm text-slate-500">
              {c.discountType === "percent" ? `${c.discountValue}% off` : `${formatCurrency(c.discountValue)} off`} on orders above{" "}
              {formatCurrency(c.minOrderValue)}
              {c.maxDiscount ? ` (max ${formatCurrency(c.maxDiscount)})` : ""}
            </p>
            <button onClick={() => remove(c.id)} className="mt-2 text-xs font-bold text-rose-500 underline">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
