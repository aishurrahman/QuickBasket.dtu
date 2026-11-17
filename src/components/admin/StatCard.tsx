export function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-extrabold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}
