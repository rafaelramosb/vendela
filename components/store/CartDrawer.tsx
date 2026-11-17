'use client';
import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { LOCALIDADES, errorText, money, waLink } from '@/lib/format';
import { useStore } from './StoreProvider';
import { ProductImage } from './ProductImage';
import { Bag, Check, Close, Whats } from './icons';

export function CartDrawer() {
  const { store, lines, subtotal, setQty, clear, open, setOpen } = useStore();
  const [step, setStep] = useState<'bag' | 'form' | 'done'>('bag');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ number: number; msg: string } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const shipping = store.shipping || 0;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    if (step === 'done') setStep('bag');
    setErr('');
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name')).trim();
    const phone = String(fd.get('phone')).trim();
    const loc = String(fd.get('loc'));
    const address = String(fd.get('address') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    setBusy(true);
    setErr('');
    const { data, error } = await supabaseBrowser().rpc('place_store_order', {
      p_slug: store.slug,
      p_items: lines.map((l) => ({ variant_id: l.variant.id, qty: l.qty })),
      p_name: name,
      p_phone: phone,
      p_locality: loc,
      p_address: address,
      p_notes: notes,
    });
    setBusy(false);
    if (error) return setErr(errorText(error));
    const r: any = data;
    const items = lines.map((l) => `• ${l.qty} x ${l.product.name} · ${l.variant.size} · ${l.variant.color} (${money(l.qty * l.product.price)})`).join('\n');
    let msg = `Hola ${store.name}, soy ${name}. Hice el pedido #${r.number}:\n${items}\nEnvío a ${loc}${address ? `, ${address}` : ''}: ${money(r.shipping)}\nTotal: ${money(r.subtotal + r.shipping)}`;
    if (notes) msg += `\nNota: ${notes}`;
    if (r.payment_key) msg += `\n\nPagaré a: ${r.payment_key}`;
    clear();
    setDone({ number: r.number, msg });
    setStep('done');
  }

  return (
    <div className={`st-drawer-wrap ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="st-scrim" onClick={close} />
      <aside className="st-drawer" role="dialog" aria-modal="true" aria-label="Tu bolsa" tabIndex={-1} ref={panel}>
        <header className="st-drawer-head">
          <h2>{step === 'form' ? 'Tus datos de entrega' : step === 'done' ? '¡Pedido recibido!' : 'Tu bolsa'}</h2>
          <button className="st-icon-btn" onClick={close} aria-label="Cerrar"><Close /></button>
        </header>

        {step === 'done' && done ? (
          <div className="st-drawer-body st-done">
            <span className="st-done-ico"><Check /></span>
            <p className="st-done-num">Pedido #{done.number}</p>
            <p>Tus productos quedaron apartados. Envía el mensaje por WhatsApp para que {store.name} confirme el pago y la entrega.</p>
            <pre className="st-msg">{done.msg}</pre>
            {store.phone && (
              <a className="st-btn st-primary block" href={waLink(store.phone, done.msg)} target="_blank" rel="noopener noreferrer"><Whats /> Enviar por WhatsApp</a>
            )}
            <button className="st-btn ghost block" onClick={close}>Seguir viendo la tienda</button>
          </div>
        ) : lines.length === 0 ? (
          <div className="st-drawer-body st-empty">
            <span className="st-empty-ico"><Bag /></span>
            <p>Tu bolsa está vacía.</p>
            <button className="st-btn st-primary" onClick={close}>Ver el catálogo</button>
          </div>
        ) : step === 'bag' ? (
          <>
            <div className="st-drawer-body">
              <ul className="st-lines">
                {lines.map((l) => (
                  <li key={l.variant.id}>
                    <div className="st-line-img"><ProductImage src={l.product.images[0]} category={l.product.category} color={l.variant.color} alt={l.product.name} /></div>
                    <div className="st-line-info">
                      <b>{l.product.name}</b>
                      <span>{l.variant.size !== 'Única' ? `Talla ${l.variant.size} · ` : ''}{l.variant.color}</span>
                      <div className="st-stepper">
                        <button onClick={() => setQty(l.variant.id, l.qty - 1)} aria-label="Quitar uno">−</button>
                        <span>{l.qty}</span>
                        <button onClick={() => setQty(l.variant.id, l.qty + 1)} disabled={l.qty >= l.variant.stock} aria-label="Agregar uno">+</button>
                      </div>
                    </div>
                    <span className="st-line-price">{money(l.qty * l.product.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <footer className="st-drawer-foot">
              <div className="st-sum"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="st-sum"><span>Envío</span><span>{shipping ? money(shipping) : 'Por confirmar'}</span></div>
              <div className="st-sum total"><span>Total</span><span>{money(subtotal + shipping)}</span></div>
              <button className="st-btn st-primary block" onClick={() => setStep('form')}>Continuar</button>
            </footer>
          </>
        ) : (
          <form className="st-drawer-body st-form" onSubmit={submit}>
            <label><span>Tu nombre</span><input id="co-name" name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
            <label><span>Tu WhatsApp</span><input id="co-phone" name="phone" required inputMode="tel" autoComplete="tel" placeholder="300 123 4567" /></label>
            <label><span>Localidad o municipio</span><select id="co-loc" name="loc">{LOCALIDADES.map((l) => <option key={l}>{l}</option>)}</select></label>
            <label><span>Dirección</span><input id="co-address" name="address" maxLength={160} autoComplete="street-address" placeholder="Calle, número, barrio, apto" /></label>
            <label><span>Nota para la tienda (opcional)</span><input id="co-notes" name="notes" maxLength={300} /></label>
            <div className="st-sum total"><span>Total con envío</span><span>{money(subtotal + shipping)}</span></div>
            {err && <p className="st-err" role="alert">{err}</p>}
            <button className="st-btn st-primary block" disabled={busy}>{busy ? 'Enviando…' : 'Confirmar pedido'}</button>
            <button type="button" className="st-btn ghost block" onClick={() => setStep('bag')}>Volver a la bolsa</button>
            <p className="st-fine">Apartamos tus productos y la tienda te confirma por WhatsApp. Tus datos solo los ve {store.name} para entregarte el pedido.</p>
          </form>
        )}
      </aside>
    </div>
  );
}
