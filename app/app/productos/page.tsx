'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { Sheet } from '@/components/Sheet';
import { Thumb } from '@/components/Thumb';
import { PurchaseSheet } from '@/components/PurchaseSheet';
import { PhotoPicker } from '@/components/PhotoPicker';
import { CATEGORIES, errorText, money, toInt } from '@/lib/format';

function Productos() {
  const { biz } = useBiz();
  const toast = useToast();
  const params = useSearchParams();
  const [items, setItems] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(params.get('nuevo') === '1');
  const [editing, setEditing] = useState<any>(null);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser()
      .from('products')
      .select('id,name,category,price,cost,active,created_at,description,images,variants(id,size,color,stock,created_at)')
      .eq('business_id', biz.id)
      .order('created_at', { ascending: false });
    if (error) return toast(errorText(error), 'error');
    (data || []).forEach((p: any) => p.variants.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)));
    setItems(data || []);
  }, [biz.id, toast]);
  useEffect(() => {
    load();
  }, [load]);

  if (!items) return <div className="skeleton" style={{ minHeight: 400 }} />;
  const active = items.filter((p) => p.active);
  const list = items.filter((p) => p.active !== showArchived && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const units = active.reduce((a, p) => a + p.variants.reduce((b: number, v: any) => b + v.stock, 0), 0);
  const value = active.reduce((a, p) => a + p.cost * p.variants.reduce((b: number, v: any) => b + v.stock, 0), 0);

  return (
    <>
      <div className="row"><h2>Productos</h2><button className="btn small primary" onClick={() => setCreating(true)}>Nuevo producto</button></div>
      <div className="tiles">
        <div className="tile"><span>Unidades en stock</span><b className="num">{units}</b></div>
        <div className="tile"><span>Plata en mercancía</span><b className="num">{money(value)}</b><small className="muted">a precio de costo</small></div>
      </div>
      <button className="btn block" onClick={() => setBuying(true)} disabled={!active.length}>Compré mercancía</button>
      <input className="search" type="search" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar producto" />
      {list.length === 0 && <div className="card empty">{items.length === 0 ? 'Crea tu primer producto con sus tallas y colores.' : 'No hay productos aquí.'}</div>}
      <div className="cards">{list.map((p) => {
        const st = p.variants.reduce((a: number, v: any) => a + v.stock, 0);
        const m = p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
        return (
          <button className="card" key={p.id} style={{ textAlign: 'left' }} onClick={() => setEditing(p)}>
            <div className="row start" style={{ width: '100%' }}>
              <Thumb category={p.category} color={p.variants[0]?.color} src={p.images?.[0]} size={64} />
              <div className="grow">
                <b>{p.name}</b>
                <div className="muted tiny num">Vendo a {money(p.price)} · me cuesta {money(p.cost)} · gano {m}%</div>
              </div>
              <b className="num">{st}</b>
            </div>
            <div className="vchips">
              {p.variants.map((v: any) => (
                <span key={v.id} className={`vchip ${v.stock === 0 ? 'out' : v.stock === 1 ? 'low' : ''}`}>{v.size} {v.color} · {v.stock}</span>
              ))}
            </div>
          </button>
        );
      })}</div>
      {items.some((p) => !p.active) && (
        <button className="link center" onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'Ver productos activos' : 'Ver productos archivados'}</button>
      )}

      <NewProduct open={creating} onClose={() => setCreating(false)} onSaved={load} />
      {editing && <EditProduct product={editing} onClose={() => setEditing(null)} onSaved={load} />}
      <PurchaseSheet open={buying} onClose={() => setBuying(false)} onSaved={load} />
    </>
  );
}

function NewProduct({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { biz } = useBiz();
  const toast = useToast();
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const p = toInt(price), c = toInt(cost);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name')).trim();
    if (!name || !p) return toast('Falta el nombre o el precio', 'error');
    const split = (s: string, d: string) => {
      const arr = Array.from(new Set(String(s || '').split(',').map((x) => x.trim()).filter(Boolean)));
      return arr.length ? arr : [d];
    };
    const sizes = split(String(fd.get('sizes')), 'Única');
    const colors = split(String(fd.get('colors')), 'Único');
    const stock = toInt(String(fd.get('stock')));
    if (sizes.length * colors.length > 60) return toast('Máximo 60 combinaciones de talla y color', 'error');
    setBusy(true);
    const sb = supabaseBrowser();
    const { data: prod, error } = await sb
      .from('products')
      .insert({ business_id: biz.id, name, category: String(fd.get('category')), price: p, cost: c, images, description: String(fd.get('description') || '').trim() || null })
      .select('id')
      .single();
    if (error) {
      setBusy(false);
      return toast(errorText(error), 'error');
    }
    const rows = sizes.flatMap((size) => colors.map((color) => ({ business_id: biz.id, product_id: prod.id, size, color, stock })));
    const { error: e2 } = await sb.from('variants').insert(rows);
    setBusy(false);
    if (e2) return toast(errorText(e2), 'error');
    toast(`${name} creado con ${rows.length} ${rows.length === 1 ? 'variante' : 'variantes'}`);
    setPrice('');
    setCost('');
    setImages([]);
    onClose();
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo producto">
      <form onSubmit={onSubmit}>
        <PhotoPicker businessId={biz.id} value={images} onChange={setImages} />
        <label className="field"><span>Nombre</span><input id="np-name" name="name" required maxLength={80} placeholder="Ej: Blusa de lino" /></label>
        <label className="field"><span>Tipo</span><select id="np-cat" name="category">{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <div className="grid2">
          <label className="field"><span>Lo vendo a</span><input id="np-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="59000" /></label>
          <label className="field"><span>Me cuesta</span><input id="np-cost" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="30000" /></label>
        </div>
        <label className="field"><span>Descripción para tu tienda (opcional)</span><textarea id="np-desc" name="description" maxLength={600} placeholder="Tela, cómo horma, cuidados" /></label>
        <small className="muted">{p && c ? `Ganas ${money(p - c)} por unidad (${Math.round(((p - c) / p) * 100)}%).` : 'Escribe precio y costo para ver cuánto ganas.'}</small>
        <label className="field"><span>Tallas</span><input id="np-sizes" name="sizes" defaultValue="S, M, L" /><small>Sepáralas con coma. Si no tiene talla, déjalo vacío.</small></label>
        <label className="field"><span>Colores</span><input id="np-colors" name="colors" defaultValue="Negro" /><small>Sepáralos con coma.</small></label>
        <label className="field"><span>Unidades de cada talla y color</span><input id="np-stock" name="stock" inputMode="numeric" defaultValue="2" /></label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button>
      </form>
    </Sheet>
  );
}

function EditProduct({ product, onClose, onSaved }: { product: any; onClose: () => void; onSaved: () => void }) {
  const { biz } = useBiz();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>(product.images || []);
  const [stocks, setStocks] = useState<Record<string, string>>(Object.fromEntries(product.variants.map((v: any) => [v.id, String(v.stock)])));

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb
      .from('products')
      .update({ name: String(fd.get('name')).trim(), category: String(fd.get('category')), price: toInt(String(fd.get('price'))), cost: toInt(String(fd.get('cost'))), images, description: String(fd.get('description') || '').trim() || null })
      .eq('id', product.id);
    if (error) {
      setBusy(false);
      return toast(errorText(error), 'error');
    }
    for (const v of product.variants) {
      const n = toInt(stocks[v.id]);
      if (n !== v.stock) {
        const { error: e2 } = await sb.rpc('adjust_stock', { p_variant: v.id, p_stock: n });
        if (e2) {
          setBusy(false);
          return toast(errorText(e2), 'error');
        }
      }
    }
    setBusy(false);
    toast('Producto actualizado');
    onClose();
    onSaved();
  }

  async function addVariant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const size = String(fd.get('size')).trim() || 'Única';
    const color = String(fd.get('color')).trim() || 'Único';
    const { error } = await supabaseBrowser().from('variants').insert({ business_id: biz.id, product_id: product.id, size, color, stock: toInt(String(fd.get('stock'))) });
    if (error) return toast(/duplicate|unique/i.test(error.message) ? 'Esa talla y color ya existe' : errorText(error), 'error');
    toast(`Agregado ${size} · ${color}`);
    onClose();
    onSaved();
  }

  async function toggleActive() {
    const { error } = await supabaseBrowser().from('products').update({ active: !product.active }).eq('id', product.id);
    if (error) return toast(errorText(error), 'error');
    toast(product.active ? 'Producto archivado: ya no aparece para vender' : 'Producto activo otra vez');
    onClose();
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} title={product.name}>
      <form onSubmit={save}>
        <PhotoPicker businessId={biz.id} value={images} onChange={setImages} />
        <label className="field"><span>Nombre</span><input id="ep-name" name="name" defaultValue={product.name} required maxLength={80} /></label>
        <label className="field"><span>Descripción para tu tienda</span><textarea id="ep-desc" name="description" defaultValue={product.description || ''} maxLength={600} placeholder="Tela, cómo horma, cuidados" /></label>
        <label className="field"><span>Tipo</span><select id="ep-cat" name="category" defaultValue={product.category}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <div className="grid2">
          <label className="field"><span>Lo vendo a</span><input id="ep-price" name="price" inputMode="numeric" defaultValue={product.price} required /></label>
          <label className="field"><span>Me cuesta</span><input id="ep-cost" name="cost" inputMode="numeric" defaultValue={product.cost} /></label>
        </div>
        <div className="field">
          <span>Unidades que tienes ahora</span>
          <small>Corrige si contaste distinto. Para mercancía nueva usa «Compré mercancía».</small>
          <div className="list">
            {product.variants.map((v: any) => (
              <label key={v.id} className="row">
                <span>{v.size} · {v.color}</span>
                <input inputMode="numeric" aria-label={`Stock ${v.size} ${v.color}`} value={stocks[v.id]} onChange={(e) => setStocks({ ...stocks, [v.id]: e.target.value })} style={{ width: 84, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: 'var(--surface)', textAlign: 'right' }} />
              </label>
            ))}
          </div>
        </div>
        <button className="btn primary block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>
      <form onSubmit={addVariant} className="card">
        <h3>Agregar talla o color</h3>
        <div className="grid2">
          <label className="field"><span>Talla</span><input id="av-size" name="size" maxLength={20} placeholder="XL" /></label>
          <label className="field"><span>Color</span><input id="av-color" name="color" maxLength={30} placeholder="Beige" /></label>
        </div>
        <label className="field"><span>Unidades</span><input id="av-stock" name="stock" inputMode="numeric" defaultValue="1" /></label>
        <button className="btn block">Agregar</button>
      </form>
      <button className="btn ghost block" onClick={toggleActive}>{product.active ? 'Archivar producto' : 'Volver a activar'}</button>
    </Sheet>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton" />}>
      <Productos />
    </Suspense>
  );
}
