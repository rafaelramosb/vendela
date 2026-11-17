'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { Sheet } from '@/components/Sheet';
import { Thumb } from '@/components/Thumb';
import { IconCheck, IconWhats } from '@/components/Icons';
import { CATEGORIES, CHANNELS, LOCALIDADES, PAYMENTS, errorText, money, toInt, waLink } from '@/lib/format';

type Variant = { id: string; size: string; color: string; stock: number };
type Product = { id: string; name: string; category: string; price: number; cost: number; variants: Variant[] };
type CartItem = { variant_id: string; product: Product; v: Variant; qty: number; price: number };

export default function Vender() {
  const { biz } = useBiz();
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [pick, setPick] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState<{ number: number; msg: string; phone: string; delivery: boolean } | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [p, c] = await Promise.all([
      sb.from('products').select('id,name,category,price,cost,variants(id,size,color,stock)').eq('business_id', biz.id).eq('active', true).order('name'),
      sb.from('customers').select('id,name,phone,locality,address').eq('business_id', biz.id).order('name').limit(1000),
    ]);
    if (p.error) toast(errorText(p.error), 'error');
    setProducts((p.data as any) || []);
    setCustomers(c.data || []);
  }, [biz.id, toast]);
  useEffect(() => {
    load();
  }, [load]);

  const cats = useMemo(() => Array.from(new Set((products || []).map((p) => p.category))), [products]);
  const shown = (products || []).filter((p) => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (!cat || p.category === cat));
  const inCart = (vid: string) => cart.find((c) => c.variant_id === vid)?.qty || 0;

  function add(p: Product, v: Variant) {
    if (inCart(v.id) >= v.stock) return toast('No hay más unidades de esa talla', 'error');
    setCart((c) => {
      const ex = c.find((x) => x.variant_id === v.id);
      if (ex) return c.map((x) => (x.variant_id === v.id ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { variant_id: v.id, product: p, v, qty: 1, price: p.price }];
    });
    toast(`${p.name} ${v.size} agregado`);
    setPick(null);
  }
  const count = cart.reduce((a, c) => a + c.qty, 0);
  const subtotal = cart.reduce((a, c) => a + c.qty * c.price, 0);

  if (!products) return <div className="skeleton" style={{ minHeight: 400 }} />;
  if (products.length === 0)
    return (
      <div className="card center">
        <h2>Aún no tienes productos</h2>
        <p className="muted" style={{ margin: 0 }}>Crea tu primer producto con sus tallas y colores para empezar a vender.</p>
        <Link href="/app/productos?nuevo=1" className="btn primary">Crear producto</Link>
      </div>
    );

  return (
    <>
      <h2>¿Qué vendiste?</h2>
      <input className="search" type="search" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar producto" />
      {cats.length > 1 && (
        <div className="tabs" role="group" aria-label="Categorías">
          <button className="tab" aria-pressed={!cat} onClick={() => setCat('')}>Todo</button>
          {cats.map((c) => (
            <button key={c} className="tab" aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORIES[c] || c}</button>
          ))}
        </div>
      )}
      <div className="prod-grid">
        {shown.map((p) => {
          const st = p.variants.reduce((a, v) => a + v.stock, 0);
          return (
            <button key={p.id} className="prod" onClick={() => setPick(p)} disabled={!st}>
              <Thumb category={p.category} color={p.variants[0]?.color} />
              <b>{p.name}</b>
              <span className="row"><span className="price num">{money(p.price)}</span><span className="muted tiny">{st ? `${st} disp.` : 'Agotado'}</span></span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <div className="empty">No encontré ese producto.</div>}

      {count > 0 && !checkout && !done && (
        <div className="cartbar">
          <div><b>{count} {count === 1 ? 'producto' : 'productos'}</b><div className="num">{money(subtotal)}</div></div>
          <button className="btn primary" onClick={() => setCheckout(true)}>Cobrar</button>
        </div>
      )}

      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick?.name}>
        {pick && (
          <div className="form">
            <div className="row start"><Thumb category={pick.category} color={pick.variants[0]?.color} /><span className="total num">{money(pick.price)}</span></div>
            <div className="field">
              <span>Toca la talla y el color</span>
              <div className="vchips">
                {pick.variants.map((v) => {
                  const left = v.stock - inCart(v.id);
                  return (
                    <button key={v.id} className={`vchip ${left <= 0 ? 'out' : left === 1 ? 'low' : ''}`} style={{ padding: '10px 12px', fontSize: 14 }} disabled={left <= 0} onClick={() => add(pick, v)}>
                      {v.size} · {v.color} ({left})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={checkout} onClose={() => setCheckout(false)} title="Cobrar">
        <Checkout
          cart={cart}
          setCart={setCart}
          customers={customers}
          onEmpty={() => setCheckout(false)}
          onDone={(r) => {
            setCheckout(false);
            setCart([]);
            setDone(r);
            load();
          }}
        />
      </Sheet>

      <Sheet open={!!done} onClose={() => setDone(null)} title={done ? `Venta #${done.number} guardada` : ''}>
        {done && (
          <div className="form">
            <span className="success-ico"><IconCheck /></span>
            <p className="center muted" style={{ margin: 0 }}>El inventario ya se descontó.</p>
            <div className="msg">{done.msg}</div>
            <a className="btn primary block" href={waLink(done.phone, done.msg)} target="_blank" rel="noopener noreferrer"><IconWhats /> Enviar comprobante por WhatsApp</a>
            {done.delivery ? <Link className="btn block" href="/app/pedidos">Ver en Pedidos</Link> : <button className="btn block" onClick={() => setDone(null)}>Seguir vendiendo</button>}
          </div>
        )}
      </Sheet>
    </>
  );
}

function Checkout({ cart, setCart, customers, onDone, onEmpty }: { cart: CartItem[]; setCart: (f: any) => void; customers: any[]; onDone: (r: any) => void; onEmpty: () => void }) {
  const { biz } = useBiz();
  const toast = useToast();
  const [cust, setCust] = useState('');
  const [phone, setPhone] = useState('');
  const [pay, setPay] = useState('Nequi');
  const [paid, setPaid] = useState(true);
  const [delivery, setDelivery] = useState(true);
  const [loc, setLoc] = useState('Kennedy');
  const [address, setAddress] = useState('');
  const [ship, setShip] = useState(String(biz.default_shipping ?? 10000));
  const [busy, setBusy] = useState(false);
  const known = customers.find((c) => c.name.toLowerCase() === cust.trim().toLowerCase());

  useEffect(() => {
    if (known) {
      if (known.locality) setLoc(known.locality);
      if (known.address) setAddress(known.address);
      if (known.phone) setPhone(known.phone);
    }
  }, [known]);

  const sub = cart.reduce((a, c) => a + c.qty * c.price, 0);
  const shipping = delivery ? toInt(ship) : 0;

  function setQty(i: number, d: number) {
    const it = cart[i];
    const q = it.qty + d;
    if (q > it.v.stock) return toast('No hay más unidades de esa talla', 'error');
    const n = q <= 0 ? cart.filter((_, j) => j !== i) : cart.map((x, j) => (j === i ? { ...x, qty: q } : x));
    setCart(n);
    if (n.length === 0) onEmpty();
  }
  function setPrice(i: number, val: string) {
    setCart((c: CartItem[]) => c.map((x, j) => (j === i ? { ...x, price: toInt(val) } : x)));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const channel = String(new FormData(e.currentTarget).get('channel'));
    setBusy(true);
    const { data, error } = await supabaseBrowser().rpc('create_sale', {
      p_business: biz.id,
      p_items: cart.map((c) => ({ variant_id: c.variant_id, qty: c.qty, price: c.price })),
      p_customer_id: known?.id ?? null,
      p_customer_name: known ? null : cust.trim() || null,
      p_customer_phone: phone || null,
      p_channel: channel,
      p_payment: pay,
      p_paid: paid && pay !== 'Contraentrega',
      p_delivery: delivery,
      p_locality: delivery ? loc : null,
      p_address: delivery ? address : null,
      p_shipping: shipping,
      p_notes: null,
    });
    setBusy(false);
    if (error) return toast(errorText(error), 'error');
    const r: any = data;
    const lines = cart.map((c) => `${c.qty} x ${c.product.name} ${c.v.size} ${c.v.color}: ${money(c.qty * c.price)}`).join('\n');
    const isPaid = paid && pay !== 'Contraentrega';
    const msg = `${biz.name}\nComprobante de venta #${r.number} (no es factura)\n${lines}${shipping ? `\nEnvío: ${money(shipping)}` : ''}\nTotal: ${money(sub + shipping)}\nPago: ${pay}${isPaid ? ' (recibido)' : ' (pendiente)'}${!isPaid && biz.payment_key ? `\nPuedes pagar a: ${biz.payment_key}` : ''}\n¡Gracias por tu compra!`;
    onDone({ number: r.number, msg, phone, delivery });
  }

  return (
    <form onSubmit={submit}>
      <div className="list">
        {cart.map((c, i) => (
          <div key={c.variant_id} className="row">
            <div className="grow"><b>{c.product.name}</b><div className="muted tiny">{c.v.size} · {c.v.color}</div>
              <input aria-label="Precio" className="tiny num" style={{ width: 110, border: '1px solid var(--line)', borderRadius: 8, padding: '4px 6px', marginTop: 4, background: 'var(--surface)' }} inputMode="numeric" value={c.price} onChange={(e) => setPrice(i, e.target.value)} />
            </div>
            <div className="qty">
              <button type="button" className="btn small" onClick={() => setQty(i, -1)} aria-label="Quitar uno">−</button>
              <b className="num">{c.qty}</b>
              <button type="button" className="btn small" onClick={() => setQty(i, 1)} aria-label="Agregar uno">+</button>
            </div>
          </div>
        ))}
      </div>
      <label className="field">
        <span>Clienta (opcional)</span>
        <input id="sale-cust" list="cust-list" value={cust} onChange={(e) => setCust(e.target.value)} placeholder="Escribe el nombre" autoComplete="off" maxLength={80} />
        <datalist id="cust-list">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
      </label>
      {cust.trim() && (
        <label className="field"><span>WhatsApp de la clienta</span><input id="sale-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" /></label>
      )}
      <div className="field">
        <span>¿Por dónde llegó?</span>
        <div className="chips">{CHANNELS.map((c, i) => <label className="chip" key={c}><input type="radio" name="channel" value={c} defaultChecked={i === 0} /><span>{c}</span></label>)}</div>
      </div>
      <div className="field">
        <span>¿Cómo paga?</span>
        <div className="chips">
          {PAYMENTS.map((p) => (
            <label className="chip" key={p}>
              <input type="radio" name="pay" value={p} checked={pay === p} onChange={() => { setPay(p); setPaid(p !== 'Contraentrega'); }} />
              <span>{p}</span>
            </label>
          ))}
        </div>
      </div>
      <label className="switch"><span>Ya me pagó</span><input type="checkbox" checked={paid} disabled={pay === 'Contraentrega'} onChange={(e) => setPaid(e.target.checked)} /></label>
      <label className="switch"><span>Es a domicilio</span><input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} /></label>
      {delivery && (
        <>
          <div className="grid2">
            <label className="field"><span>Localidad</span><select id="sale-loc" value={loc} onChange={(e) => setLoc(e.target.value)}>{LOCALIDADES.map((l) => <option key={l}>{l}</option>)}</select></label>
            <label className="field"><span>Envío</span><input id="sale-ship" inputMode="numeric" value={ship} onChange={(e) => setShip(e.target.value)} /></label>
          </div>
          <label className="field"><span>Dirección (opcional)</span><input id="sale-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} placeholder="Calle, número, barrio" /></label>
        </>
      )}
      <div className="row"><span className="muted">Total{shipping ? ' con envío' : ''}</span><span className="total num">{money(sub + shipping)}</span></div>
      <button className="btn primary block" disabled={busy || cart.length === 0}>{busy ? 'Guardando…' : 'Guardar venta'}</button>
    </form>
  );
}
