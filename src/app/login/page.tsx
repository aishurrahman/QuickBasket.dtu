"use client";

import Link from "next/link";
import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

function LoginForm() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const confirmationNotice = params.get("confirmed") === "1"
    ? "Your email is confirmed. You can now log in."
    : params.get("registered") === "1"
      ? "Your account was created. Check your email to confirm it before logging in."
      : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Login failed");
      return;
    }
    if (result.requiresEmailConfirmation) {
      setNotice("We sent a confirmation email. Confirm your email, then log in again.");
      return;
    }
    showToast("Welcome back!", "success");
    router.push(next);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-3xl">🧺</p>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to continue shopping on QuickBasket.</p>

        {(notice || confirmationNotice) && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice || confirmationNotice}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            <label className="mb-1 block text-xs font-bold text-slate-600">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Log in with the email and password you registered with. Passwords are verified by Supabase Auth.
        </p>

        <p className="mt-4 text-center text-sm text-slate-600">
          New here?{" "}
          <Link href="/register" className="font-bold text-emerald-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
