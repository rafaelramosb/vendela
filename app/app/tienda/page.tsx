'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { errorText, toInt } from '@/lib/format';

export default function Tienda() {
  const { biz, plan, refresh } = useBiz();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/t/${biz.slug}` : `/t/${biz.slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado. Pégalo en tu bio de TikTok e Instagram.');
    } catch {
      toast('Tu navegador no dejó copiar', 'error');
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabaseBrowser()
      .from('businesses')
      .update({
        store_enabled: !!fd.get('store_enabled'),
        store_tagline: String(fd.get('store_tagline') || '').trim() || null,
        default_shipping: toInt(String(fd.get('default_shipping'))),
        payment_key: String(fd.get('payment_key') || '').trim() || null,
      })
      .eq('id', biz.id);
    setBusy(false);
    if (error) return toast(errorText(error), 'error');
    await refresh();
    toast('Tienda actualizada');
  }

  return (
    <>
      <h2>Mi tienda en línea</h2>
      {plan === 'free' && <Link href="/app/plan" className="notice" style={{ textDecoration: 'none' }}>La tienda en línea está pausada en el plan Gratis. Activa el plan Emprendedor para recibir pedidos.</Link>}
      <section className="card">
        <b>Tu link para la bio</b>
        <span className="muted tiny" style={{ wordBreak: 'break-all' }}>{url}</span>
        <div className="grid2">
          <button className="btn" onClick={copy}>Copiar link</button>
          <Link className="btn primary" href={`/t/${biz.slug}`} target="_blank">Ver mi tienda</Link>
        </div>
        <small className="muted">Tu clienta elige talla y color, y el pedido te llega a WhatsApp y a Pedidos con el stock apartado.</small>
      </section>
      <form className="card" onSubmit={save}>
        <label className="switch"><span>Recibir pedidos en línea</span><input name="store_enabled" type="checkbox" defaultChecked={biz.store_enabled} /></label>
        <label className="field"><span>Frase de tu tienda</span><input id="st-tagline" name="store_tagline" maxLength={120} defaultValue={biz.store_tagline || ''} placeholder="Ropa y accesorios · envíos en Bogotá" /></label>
        <label className="field"><span>Valor del domicilio</span><input id="st-ship" name="default_shipping" inputMode="numeric" defaultValue={biz.default_shipping} /></label>
        <label className="field"><span>Dónde te pagan</span><input id="st-pay" name="payment_key" maxLength={80} defaultValue={biz.payment_key || ''} placeholder="Nequi 300 123 4567 o llave Bre-B" /><small>Se muestra a la clienta después de hacer el pedido y en los cobros por WhatsApp.</small></label>
        <button className="btn primary block" disabled={busy}>Guardar</button>
      </form>
      {!biz.phone && <div className="notice">Agrega tu WhatsApp en <Link href="/app/ajustes">Ajustes</Link> para que los pedidos de la tienda te lleguen.</div>}
    </>
  );
}
