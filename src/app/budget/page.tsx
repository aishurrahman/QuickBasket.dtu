import { BudgetGuard } from "@/components/BudgetGuard";

export default function BudgetPage() {
  return <main className="mx-auto max-w-4xl px-4 py-6"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Personal spending tools</p><h1 className="mb-4 text-2xl font-extrabold text-slate-800">Budget Guard</h1><BudgetGuard /></main>;
}
