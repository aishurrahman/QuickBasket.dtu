"use client";

import { useEffect, useState, FormEvent } from "react";
import { useToast } from "@/context/ToastContext";

type Category = { id: number; name: string; emoji: string; sortOrder: number };

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", emoji: "🛒" });

  async function load() {
    const data = await fetch("/api/categories").then((r) => r.json());
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (active) setCategories(data.categories ?? []);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, emoji: form.emoji, sortOrder: categories.length }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Could not create category", "error");
      return;
    }
    showToast("Category added", "success");
    setForm({ name: "", emoji: "🛒" });
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this category? Products inside will also be removed.")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    showToast("Category deleted", "success");
    load();
  }

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Categories</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          placeholder="Emoji"
          value={form.emoji}
          onChange={(e) => setForm({ ...form, emoji: e.target.value })}
          className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Category name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
          Add
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="text-xl">{c.emoji}</span> {c.name}
            </span>
            <button onClick={() => handleDelete(c.id)} className="text-xs font-bold text-rose-500 underline">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
