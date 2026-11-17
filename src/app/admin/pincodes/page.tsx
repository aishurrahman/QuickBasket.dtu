"use client";

import { useEffect, useState, FormEvent } from "react";
import { useToast } from "@/context/ToastContext";

type Pincode = { id: number; pincode: string; area: string; deliverable: boolean };

export default function AdminPincodesPage() {
  const { showToast } = useToast();
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [form, setForm] = useState({ pincode: "", area: "", deliverable: true });

  async function load() {
    const data = await fetch("/api/pincodes").then((r) => r.json());
    setPincodes(data.pincodes ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/pincodes")
      .then((r) => r.json())
      .then((data) => {
        if (active) setPincodes(data.pincodes ?? []);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pincodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Could not add pincode", "error");
      return;
    }
    showToast("Pincode added", "success");
    setForm({ pincode: "", area: "", deliverable: true });
    load();
  }

  async function toggleDeliverable(p: Pincode) {
    await fetch(`/api/pincodes/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliverable: !p.deliverable }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this pincode?")) return;
    await fetch(`/api/pincodes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Serviceable Pincodes</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          required
          placeholder="Pincode"
          value={form.pincode}
          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Area name"
          value={form.area}
          onChange={(e) => setForm({ ...form, area: e.target.value })}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.deliverable} onChange={(e) => setForm({ ...form, deliverable: e.target.checked })} />
          Deliverable
        </label>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
          Add
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <th className="p-3">Pincode</th>
              <th className="p-3">Area</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pincodes.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-semibold">{p.pincode}</td>
                <td className="p-3">{p.area}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleDeliverable(p)}
                    className={`rounded-full px-2 py-1 text-xs font-bold ${p.deliverable ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}
                  >
                    {p.deliverable ? "Deliverable" : "Not deliverable"}
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => remove(p.id)} className="text-xs font-bold text-rose-500 underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
