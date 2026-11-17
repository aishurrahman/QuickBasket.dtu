"use client";

type Props = {
  quantity: number;
  stock: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: "sm" | "md";
};

export function QtyStepper({ quantity, stock, onAdd, onIncrement, onDecrement, size = "md" }: Props) {
  const pad = size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm";

  if (quantity === 0) {
    return (
      <button
        onClick={onAdd}
        disabled={stock <= 0}
        className={`w-full rounded-lg border border-emerald-600 bg-emerald-50 font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 ${pad}`}
      >
        {stock <= 0 ? "Out of stock" : "ADD"}
      </button>
    );
  }

  return (
    <div className={`flex w-full items-center justify-between rounded-lg bg-emerald-600 font-bold text-white ${pad}`}>
      <button onClick={onDecrement} className="flex-1 px-2" aria-label="Decrease quantity">
        −
      </button>
      <span className="px-1 tabular-nums">{quantity}</span>
      <button
        onClick={onIncrement}
        disabled={quantity >= stock}
        className="flex-1 px-2 disabled:opacity-50"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
