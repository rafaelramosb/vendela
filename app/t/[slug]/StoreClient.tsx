'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Sheet } from '@/components/Sheet';
import { Thumb } from '@/components/Thumb';
import { useToast } from '@/components/Toast';
import { IconCheck, IconWhats } from '@/components/Icons';
import { LOCALIDADES, errorText, money, waLink } from '@/lib/format';

type V = { id: string; size: string; color: string; stock: number };
type P = { id: string; name: string; category: string; price: number; variants: V[] };
type Item = { p: P; v: V; qty: number };

export function StoreClient({ store }: { store: any }) {
  const toast = useToast();
  const [pick, setPick] = useState<P | null>(null);
  const [cart, setCart] = useState<Item[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ number: number; msg: string } | null>(null);

  if (!store.enabled)
    return (
      <div className="auth">
        <div className="card center">
          <h1 style={{ fontSize: 26 }}>{store.name}</h1>
          <p className="muted" style={{ margin: 0 }}>Esta tienda no está recibiendo pedidos en línea por ahora.</p>
          {store.phone && <a className="btn primary" href={waLink(store.phone, `Hola ${store.name}, quiero ver tu catálogo.`)} target="_blank" rel="noopener noreferrer"><IconWhats /> Escribir por WhatsApp</a>}
        </div>
      </div>
    );

  const count = cart.reduce((a, c) => a + c.qty, 0);
  const subtotal = cart.reduce((a, c) => a + c.qty * c.p.price, 0);
  const inCart = (vid: string) => cart.find((c) => c.v.id === vid)?.qty || 0;

  function add(p: P, v: V) {
    if (inCart(v.id) >= Math.min(v.stock, 5)) return toast('No hay más unidades disponibles de esa talla', 'error');
    setCart((c) => (c.some((x) => x.v.id === v.id) ? c.map((x) => (x.v.id === v.id ? { ...x, qty: x.qty + 1 } : x)) : [...c, { p, v, qty: 1 }]));
    setPick(null);
    toast(`${p.name} ${v.size} agregado`);
  }
  function remove(vid: string) {
    const n = cart.filter((x) => x.v.id !== vid);
    setCart(n);
    if (!n.length) setCheckout(false);
  }

  async function order(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name')).trim();
    const phone = String(fd.get('phone')).trim();
    const loc = String(fd.get('loc'));
    const address = String(fd.get('address') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    setBusy(true);
    const { data, error } = await supabaseBrowser().rpc('place_store_order', {
      p_slug: store.slug,
      p_items: cart.map((c) => ({ variant_id: c.v.id, qty: c.qty })),
      p_name: name,
      p_phone: phone,
      p_locality: loc,
      p_address: address,
      p_notes: notes,
    });
    setBusy(false);
    if (error) return toast(errorText(error), 'error');
    const r: any = data;
    const lines = cart.map((c) => `${c.qty} x ${c.p.name} talla ${c.v.size} ${c.v.color} (${money(c.p.price * c.qty)})`).join('\n');
    const msg = `Hola ${store.name}, soy ${name}. Hice el pedido #${r.number}:\n${lines}\nEnvío a ${loc}${address ? `, ${address}` : ''}: ${money(r.shipping)}\nTotal: ${money(r.subtotal + r.shipping)}${notes ? `\nNota: ${notes}` : ''}`;
    setCart([]);
    setCheckout(false);
    setDone({ number: r.number, msg: r.payment_key ? `${msg}\n\nPagaré a: ${r.payment_key}` : msg });
  }

  return (
    <>
      <div className="store-top">
        <div className="in">
          <h1>{store.name}</h1>
          <div>{store.tagline || `Envíos en ${store.city}`}</div>
        </div>
      </div>
      <div className="store-wrap">
        {store.products.length === 0 ? (
          <div className="card empty">Pronto habrá productos aquí.</div>
        ) : (
          <div className="prod-grid">
            {store.products.map((p: P) => (
              <button key={p.id} className="prod" onClick={() => setPick(p)}>
                <Thumb category={p.category} color={p.variants[0]?.color} />
                <b>{p.name}</b>
                <span className="price num">{money(p.price)}</span>
                <span className="btn small primary">Lo quiero</span>
              </button>
            ))}
          </div>
        )}
        <p className="muted tiny center">Tienda hecha con Vendela</p>
      </div>

      {count > 0 && !checkout && (
        <div className="cartbar" style={{ bottom: 16 }}>
          <div><b>{count} {count === 1 ? 'producto' : 'productos'}</b><div className="num">{money(subtotal)}</div></div>
          <button className="btn primary" onClick={() => setCheckout(true)}>Hacer pedido</button>
        </div>
      )}

      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick?.name}>
        {pick && (
          <div className="form">
            <span className="total num">{money(pick.price)}</span>
            <div className="field">
              <span>Elige talla y color</span>
              <div className="vchips">
                {pick.variants.map((v) => (
                  <button key={v.id} className="vchip" style={{ padding: '10px 12px', fontSize: 14 }} onClick={() => add(pick, v)} disabled={inCart(v.id) >= v.stock}>
                    {v.size} · {v.color}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={checkout} onClose={() => setCheckout(false)} title="Tu pedido">
        <div className="list">
          {cart.map((c) => (
            <div className="row" key={c.v.id}>
              <div className="grow"><b>{c.qty} × {c.p.name}</b><div className="muted tiny">{c.v.size} · {c.v.color}</div></div>
              <span className="num">{money(c.qty * c.p.price)}</span>
              <button className="icon-btn" aria-label="Quitar" onClick={() => remove(c.v.id)}>✕</button>
            </div>
          ))}
        </div>
        <form onSubmit={order}>
          <label className="field"><span>Tu nombre</span><input id="so-name" name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
          <label className="field"><span>Tu WhatsApp</span><input id="so-phone" name="phone" required inputMode="tel" autoComplete="tel" placeholder="300 123 4567" /></label>
          <label className="field"><span>Localidad o municipio</span><select id="so-loc" name="loc">{LOCALIDADES.map((l) => <option key={l}>{l}</option>)}</select></label>
          <label className="field"><span>Dirección</span><input id="so-address" name="address" maxLength={160} autoComplete="street-address" placeholder="Calle, número, barrio" /></label>
          <label className="field"><span>Nota (opcional)</span><input id="so-notes" name="notes" maxLength={300} /></label>
          <div className="row"><span className="muted">Total con envío</span><span className="total num">{money(subtotal + (store.shipping || 0))}</span></div>
          <small className="muted">Al pedir, apartamos tus productos y la tienda te confirma por WhatsApp. Tus datos solo los ve {store.name} para entregarte el pedido.</small>
          <button className="btn primary block" disabled={busy}>{busy ? 'Enviando…' : 'Hacer pedido'}</button>
        </form>
      </Sheet>

      <Sheet open={!!done} onClose={() => setDone(null)} title={done ? `Pedido #${done.number} recibido` : ''}>
        {done && (
          <div className="form">
            <span className="success-ico"><IconCheck /></span>
            <p className="center" style={{ margin: 0 }}>Tus productos quedaron apartados. Envía el mensaje por WhatsApp para confirmar y coordinar el pago.</p>
            <div className="msg">{done.msg}</div>
            {store.phone && <a className="btn primary block" href={waLink(store.phone, done.msg)} target="_blank" rel="noopener noreferrer"><IconWhats /> Enviar por WhatsApp</a>}
          </div>
        )}
      </Sheet>
    </>
  );
}
