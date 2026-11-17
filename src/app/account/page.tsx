"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

type Address = {
  id: number;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
};

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "Home", line1: "", line2: "", city: "", state: "", pincode: "", phone: "" });

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/account");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((data) => setAddresses(data.addresses ?? []));
  }, [user]);

  async function addAddress(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Could not save address", "error");
      return;
    }
    setAddresses((prev) => [...prev, data.address]);
    setForm({ label: "Home", line1: "", line2: "", city: "", state: "", pincode: "", phone: "" });
    setShowForm(false);
    showToast("Address added", "success");
  }

  async function deleteAddress(id: number) {
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading || !user) return <main className="px-4 py-16 text-center text-slate-400">Loading...</main>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-extrabold text-slate-800">My Account</h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold text-slate-700">Profile</h2>
        <p className="text-sm text-slate-600">
          <b>Name:</b> {user.name}
        </p>
        <p className="text-sm text-slate-600">
          <b>Email:</b> {user.email}
        </p>
        {user.phone && (
          <p className="text-sm text-slate-600">
            <b>Phone:</b> {user.phone}
          </p>
        )}
        <p className="mt-2 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{user.role}</p>
        <button
          onClick={async () => {
            await logout();
            router.push("/");
          }}
          className="mt-4 block rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
        >
          Log out
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-700">Saved Addresses</h2>
          <button onClick={() => setShowForm((v) => !v)} className="text-sm font-bold text-emerald-700 underline">
            {showForm ? "Cancel" : "+ Add"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addAddress} className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-slate-300 p-3">
            <input
              required
              placeholder="Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
            />
            <input
              required
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
            />
            <input
              required
              placeholder="Address line 1"
              value={form.line1}
              onChange={(e) => setForm({ ...form, line1: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Address line 2"
              value={form.line2}
              onChange={(e) => setForm({ ...form, line2: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Pincode"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="col-span-2 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700">
              Save Address
            </button>
          </form>
        )}

        {addresses.length === 0 ? (
          <p className="text-sm text-slate-400">No saved addresses yet.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded-xl border border-slate-200 p-3 text-sm">
                <div>
                  <p className="font-bold text-slate-800">
                    {a.label} {a.isDefault && <span className="text-xs font-semibold text-emerald-600">(default)</span>}
                  </p>
                  <p className="text-slate-600">
                    {a.line1}, {a.line2 ? `${a.line2}, ` : ""}
                    {a.city}, {a.state} - {a.pincode}
                  </p>
                  <p className="text-slate-500">📞 {a.phone}</p>
                </div>
                <button onClick={() => deleteAddress(a.id)} className="text-xs font-bold text-rose-500 underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
