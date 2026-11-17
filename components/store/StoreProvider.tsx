'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SProduct, SVariant, Store } from '@/lib/store';

export type Line = { product: SProduct; variant: SVariant; qty: number };
type Ctx = {
  store: Store;
  lines: Line[];
  count: number;
  subtotal: number;
  add: (p: SProduct, v: SVariant, qty?: number) => boolean;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
};
const C = createContext<Ctx | null>(null);

export function StoreProvider({ store, children }: { store: Store; children: React.ReactNode }) {
  const key = `vendela-cart:${store.slug}`;
  const [raw, setRaw] = useState<{ v: string; q: number }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) setRaw(JSON.parse(s));
    } catch {}
  }, [key]);
  const persist = useCallback(
    (next: { v: string; q: number }[]) => {
      setRaw(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
    },
    [key]
  );

  const index = useMemo(() => {
    const m = new Map<string, { p: SProduct; v: SVariant }>();
    (store.products || []).forEach((p) => p.variants.forEach((v) => m.set(v.id, { p, v })));
    return m;
  }, [store.products]);

  const lines: Line[] = useMemo(
    () =>
      raw
        .map((r) => {
          const hit = index.get(r.v);
          return hit ? { product: hit.p, variant: hit.v, qty: Math.min(r.q, hit.v.stock) } : null;
        })
        .filter((x): x is Line => !!x && x.qty > 0),
    [raw, index]
  );

  const add = (p: SProduct, v: SVariant, qty = 1) => {
    const cur = raw.find((r) => r.v === v.id)?.q || 0;
    if (cur + qty > v.stock) return false;
    persist(cur ? raw.map((r) => (r.v === v.id ? { ...r, q: cur + qty } : r)) : [...raw, { v: v.id, q: qty }]);
    return true;
  };
  const setQty = (variantId: string, qty: number) => persist(qty <= 0 ? raw.filter((r) => r.v !== variantId) : raw.map((r) => (r.v === variantId ? { ...r, q: qty } : r)));
  const clear = () => persist([]);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.qty * l.product.price, 0);

  return <C.Provider value={{ store, lines, count, subtotal, add, setQty, clear, open, setOpen }}>{children}</C.Provider>;
}

export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error('useStore fuera de StoreProvider');
  return v;
}
