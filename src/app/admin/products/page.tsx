"use client";

import { useEffect, useState, FormEvent } from "react";
import { formatCurrency } from "@/lib/pricing";
import { useToast } from "@/context/ToastContext";

type Category = { id: number; name: string; emoji: string };
type Product = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  imageEmoji: string | null;
  unit: string;
  mrp: string;
  price: string;
  stock: number;
  isActive: boolean;
};

const emptyForm = {
  id: 0,
  categoryId: 0,
  name: "",
  description: "",
  imageEmoji: "🛍️",
  unit: "",
  mrp: "",
  price: "",
  stock: "100",
  isActive: true,
};

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  async function loadData() {
    const [catRes, prodRes] = await Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/products?includeInactive=true&limit=200").then((r) => r.json()),
    ]);
    setCategories(catRes.categories ?? []);
    setProducts(prodRes.products ?? []);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/products?includeInactive=true&limit=200").then((r) => r.json()),
    ]).then(([catData, productData]) => {
      if (!active) return;
      setCategories(catData.categories ?? []);
      setProducts(productData.products ?? []);
    });

    return () => {
      active = false;
    };
  }, []);

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      description: p.description ?? "",
      imageEmoji: p.imageEmoji ?? "🛍️",
      unit: p.unit,
      mrp: p.mrp,
      price: p.price,
      stock: String(p.stock),
      isActive: p.isActive,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? 0 });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name,
      description: form.description,
      imageEmoji: form.imageEmoji,
      unit: form.unit,
      mrp: Number(form.mrp),
      price: Number(form.price),
      stock: Number(form.stock),
      isActive: form.isActive,
    };

    const res = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Could not save product", "error");
      return;
    }
    showToast(editingId ? "Product updated" : "Product created", "success");
    setShowForm(false);
    loadData();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    showToast("Product deleted", "success");
    loadData();
  }

  async function toggleActive(p: Product) {
    await fetch(`/api/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    loadData();
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">Products</h1>
        <button onClick={startNew} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
          + Add Product
        </button>
      </div>

      <input
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="col-span-2 font-bold text-slate-700">{editingId ? "Edit Product" : "New Product"}</h2>
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          >
            <option value={0} disabled>
              Select category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Unit (e.g. 1 kg)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Emoji 🍎"
            value={form.imageEmoji}
            onChange={(e) => setForm({ ...form, imageEmoji: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            step="0.01"
            placeholder="MRP"
            value={form.mrp}
            onChange={(e) => setForm({ ...form, mrp: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            step="0.01"
            placeholder="Selling price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            placeholder="Stock"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active (visible to customers)
          </label>
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <th className="p-3">Product</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="flex items-center gap-2 p-3">
                  <span className="text-xl">{p.imageEmoji}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.unit}</p>
                  </div>
                </td>
                <td className="p-3 font-bold">{formatCurrency(p.price)}</td>
                <td className="p-3">
                  <span className={p.stock < 10 ? "font-bold text-rose-600" : ""}>{p.stock}</span>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggleActive(p)}
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {p.isActive ? "Active" : "Hidden"}
                  </button>
                </td>
                <td className="space-x-2 p-3">
                  <button onClick={() => startEdit(p)} className="text-xs font-bold text-emerald-700 underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs font-bold text-rose-500 underline">
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
