"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { computeTotals } from "@/lib/pricing";

export type CartItem = {
  productId: number;
  name: string;
  price: number;
  mrp: number;
  unit: string;
  imageEmoji: string;
  quantity: number;
  stock: number;
};

type CartContextValue = {
  items: CartItem[];
  totals: ReturnType<typeof computeTotals>;
  itemCount: number;
  coupon: {
    code: string;
    discountType: string;
    discountValue: number;
    minOrderValue: number;
    maxDiscount: number | null;
  } | null;
  setCoupon: (coupon: CartContextValue["coupon"]) => void;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  getQuantity: (productId: number) => number;
};

type CartCoupon = NonNullable<CartContextValue["coupon"]>;

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "quickbasket_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<CartCoupon | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let storedItems: CartItem[] | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) storedItems = JSON.parse(raw);
    } catch {
      // ignore
    }
    queueMicrotask(() => {
      if (storedItems) setItems(storedItems);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, existing.stock);
        return prev.map((i) => (i.productId === item.productId ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { ...item, quantity: Math.min(qty, item.stock) }];
    });
  }, []);

  const updateQuantity = useCallback((productId: number, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.productId !== productId);
      return prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i));
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, []);

  const getQuantity = useCallback((productId: number) => items.find((i) => i.productId === productId)?.quantity ?? 0, [items]);

  const totals = useMemo(
    () =>
      computeTotals(
        items.map((i) => ({ price: i.price, quantity: i.quantity })),
        coupon
          ? {
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              minOrderValue: coupon.minOrderValue,
              maxDiscount: coupon.maxDiscount,
            }
          : null,
      ),
    [items, coupon],
  );

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, totals, itemCount, coupon, setCoupon, addItem, updateQuantity, removeItem, clearCart, getQuantity }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
