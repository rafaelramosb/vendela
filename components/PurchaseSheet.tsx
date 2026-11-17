'use client';
import { useEffect, useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { useBiz } from './BizProvider';
import { useToast } from './Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { errorText, toInt } from '@/lib/format';

export function PurchaseSheet({ open, onClose, onSaved, variantId }: { open: boolean; onClose: () => void; onSaved?: () => void; variantId?: string }) {
  const { biz } = useBiz();
  const toast = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [sel, setSel] = useState(variantId || '');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabaseBrowser()
      .from('products')
      .select('id,name,cost,variants(id,size,color,stock)')
      .eq('business_id', biz.id)
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setProducts(data || []);
        const first = variantId || data?.[0]?.variants?.[0]?.id || '';
        setSel(first);
      });
  }, [open, biz.id, variantId]);

  const product = useMemo(() => products.find((p) => p.variants.some((v: any) => v.id === sel)), [products, sel]);
  useEffect(() => {
    if (product) setCost(String(product.cost || ''));
  }, [product]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const qty = toInt(String(new FormData(e.currentTarget).get('qty')));
    if (!sel || !qty) return toast('Elige el producto y la cantidad', 'error');
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('register_purchase', {
      p_variant: sel,
      p_qty: qty,
      p_unit_cost: cost === '' ? null : toInt(cost),
    });
    setBusy(false);
    if (error) return toast(errorText(error), 'error');
    toast(`+${qty} unidades al inventario`);
    onClose();
    onSaved?.();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Compré mercancía">
      {products.length === 0 ? (
        <div className="empty">Primero crea tus productos en la pestaña Productos.</div>
      ) : (
        <form onSubmit={onSubmit}>
          <label className="field">
            <span>Producto, talla y color</span>
            <select id="pur-variant" value={sel} onChange={(e) => setSel(e.target.value)}>
              {products.map((p) => (
                <optgroup label={p.name} key={p.id}>
                  {p.variants.map((v: any) => (
                    <option key={v.id} value={v.id}>{p.name} · {v.size} · {v.color} (hay {v.stock})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="grid2">
            <label className="field"><span>Cantidad</span><input id="pur-qty" name="qty" inputMode="numeric" defaultValue="3" required /></label>
            <label className="field"><span>Costo por unidad</span><input id="pur-cost" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} /></label>
          </div>
          <small className="muted">El costo del producto se promedia con lo que ya tenías.</small>
          <button className="btn primary block" disabled={busy}>Sumar al inventario</button>
        </form>
      )}
    </Sheet>
  );
}
