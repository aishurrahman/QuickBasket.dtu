"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await register(name, email, password, phone || undefined);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Registration failed");
      return;
    }
    if (result.requiresEmailConfirmation) {
      showToast("Check your email to confirm your QuickBasket account.", "success");
      router.push("/login?registered=1");
      return;
    }
    showToast("Account created! Welcome to QuickBasket.", "success");
    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-3xl">🧺</p>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Sign up to start ordering from QuickBasket.</p>
        <p className="mt-2 text-xs text-slate-500">Your password is securely managed by Supabase. If email confirmation is enabled, check your inbox before logging in.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              placeholder="Asha Verma"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              placeholder="9999999999"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              placeholder="At least 6 characters"
            />
          </div>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-emerald-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
