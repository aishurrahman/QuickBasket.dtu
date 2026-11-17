import { STATUS_FLOW, STATUS_LABELS, type OrderStatus } from "@/lib/pricing";

const ICONS: Record<OrderStatus, string> = {
  placed: "🧾",
  confirmed: "✅",
  packed: "📦",
  out_for_delivery: "🛵",
  delivered: "🏠",
  cancelled: "✖️",
};

export function StatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700 ring-1 ring-rose-200">
        ✖️ This order has been cancelled.
      </div>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status as OrderStatus);

  return (
    <div className="flex items-stretch justify-between">
      {STATUS_FLOW.map((step, idx) => {
        const done = idx <= currentIndex;
        const isLast = idx === STATUS_FLOW.length - 1;
        return (
          <div key={step} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                  done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {ICONS[step]}
              </div>
              {!isLast && <div className={`h-1 flex-1 ${idx < currentIndex ? "bg-emerald-600" : "bg-slate-200"}`} />}
            </div>
            <p className={`mt-2 text-center text-[11px] font-bold leading-tight ${done ? "text-emerald-700" : "text-slate-400"}`}>
              {STATUS_LABELS[step]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
