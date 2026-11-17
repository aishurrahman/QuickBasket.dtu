"use client";

import { useEffect, useState } from "react";

export function EtaCountdown({ placedAt, etaMinutes, status }: { placedAt: string; etaMinutes: number; status: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      const placedTime = new Date(placedAt).getTime();
      const deadline = placedTime + etaMinutes * 60 * 1000;
      const diffMs = deadline - Date.now();
      setRemaining(Math.max(Math.floor(diffMs / 1000), 0));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [placedAt, etaMinutes]);

  if (status === "delivered" || status === "cancelled" || remaining === null) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-emerald-600 p-4 text-white">
      <span className="text-3xl">⏱️</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Estimated arrival</p>
        <p className="text-2xl font-extrabold tabular-nums">
          {remaining > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : "Any moment now!"}
        </p>
        <p className="text-[11px] text-emerald-100">Illustrative estimate — actual time may vary.</p>
      </div>
    </div>
  );
}
