import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl">🧺</p>
      <h1 className="mt-4 text-2xl font-extrabold text-slate-800">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700">
        Back to Home
      </Link>
    </main>
  );
}
