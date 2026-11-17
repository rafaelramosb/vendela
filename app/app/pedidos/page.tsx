'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { Sheet } from '@/components/Sheet';
import { IconWhats } from '@/components/Icons';
import { PAYMENTS, STATUS_LABEL, dayLabel, errorText, money, waLink } from '@/lib/format';

const TABS = [
  ['nuevo', 'Nuevos'],
  ['encamino', 'En camino'],
  ['entregado', 'Entregados'],
  ['debe', 'Me deben'],
  ['cancelado', 'Cancelados'],
] as const;

function Pedidos() {
  const { biz } = useBiz();
  const toast = useToast();
  const params = useSearchParams();
  const [f, setF] = useState<string>(params.get('f') || 'nuevo');
  const [orders, setOrders] = useState<any[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cancel, setCancel] = useState<any>(null);
  const [payFor, setPayFor] = useState<any>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    let q = sb
      .from('orders')
      .select('id,number,status,paid,channel,payment_method,subtotal,shipping,locality,address,notes,sold_on,delivery,customers(name,phone),order_items(name,size,color,qty,price)')
      .eq('business_id', biz.id)
      .order('number', { ascending: false })
      .limit(100);
    q = f === 'debe' ? q.eq('paid', false).neq('status', 'cancelado') : q.eq('status', f);
    const [{ data, error }, c] = await Promise.all([
      q,
      sb.from('orders').select('status,paid').eq('business_id', biz.id).in('status', ['nuevo', 'encamino']),
    ]);
    if (error) return toast(errorText(error), 'error');
    setOrders(data || []);
    const { count: debe } = await sb.from('orders').select('id', { count: 'exact', head: true }).eq('business_id', biz.id).eq('paid', false).neq('status', 'cancelado');
    const cc: Record<string, number> = { nuevo: 0, encamino: 0, debe: debe || 0 };
    (c.data || []).forEach((o: any) => (cc[o.status] = (cc[o.status] || 0) + 1));
    setCounts(cc);
  }, [biz.id, f, toast]);
  useEffect(() => {
    setOrders(null);
    load();
  }, [load]);

  async function advance(o: any) {
    const next = o.status === 'nuevo' ? 'encamino' : 'entregado';
    const { error } = await supabaseBrowser().rpc('set_order_status', { p_order: o.id, p_status: next });
    if (error) return toast(errorText(error), 'error');
    toast(next === 'encamino' ? `Pedido #${o.number} en camino` : `Pedido #${o.number} entregado`);
    load();
  }
  async function markPaid(o: any, method: string) {
    const { error } = await supabaseBrowser().from('orders').update({ paid: true, payment_method: method }).eq('id', o.id);
    if (error) return toast(errorText(error), 'error');
    toast(`Listo, #${o.number} quedó pagado`);
    setPayFor(null);
    load();
  }
  async function doCancel() {
    const { error } = await supabaseBrowser().rpc('cancel_order', { p_order: cancel.id });
    if (error) return toast(errorText(error), 'error');
    toast(`Pedido #${cancel.number} cancelado. El stock volvió al inventario.`);
    setCancel(null);
    load();
  }

  return (
    <>
      <h2>Pedidos</h2>
      <div className="tabs" role="group" aria-label="Filtrar pedidos">
        {TABS.map(([k, label]) => (
          <button key={k} className="tab" aria-pressed={f === k} onClick={() => setF(k)}>
            {label}{counts[k] ? ` · ${counts[k]}` : ''}
          </button>
        ))}
      </div>
      {!orders ? (
        <div className="skeleton" />
      ) : orders.length === 0 ? (
        <div className="card empty">No hay pedidos aquí.</div>
      ) : (
        <div className="cards">{orders.map((o) => {
          const total = o.subtotal + o.shipping;
          const c = o.customers;
          const first = c?.name?.split(' ')[0] || '';
          const remind = `Hola ${first}, te recuerdo el pago de tu pedido #${o.number} de ${biz.name} por ${money(total)}.${biz.payment_key ? ` Puedes pagar a: ${biz.payment_key}.` : ''} ¡Gracias!`;
          const ontheway = `Hola ${first}, tu pedido #${o.number} de ${biz.name} ya va en camino. ¡Gracias por tu compra!`;
          return (
            <article className="card" key={o.id}>
              <div className="row">
                <div className="grow">
                  <b>#{o.number} · {c?.name || 'Cliente de paso'}</b>
                  <div className="muted tiny">
                    {dayLabel(o.sold_on)}{o.locality ? ` · ${o.locality}` : ''} · <span className="pill ch">{o.channel}</span>
                  </div>
                </div>
                <span className={`pill ${o.status}`}>{STATUS_LABEL[o.status]}</span>
              </div>
              <div className="tiny">
                {o.order_items.map((i: any, k: number) => (
                  <div key={k}>{i.qty} × {i.name} ({i.size}, {i.color})</div>
                ))}
                {o.address && <div className="muted">Dirección: {o.address}</div>}
                {o.notes && <div className="muted">Nota: {o.notes}</div>}
              </div>
              <div className="row">
                <div>
                  <b className="num">{money(o.subtotal)}</b>
                  {o.shipping > 0 && <span className="muted tiny num"> + envío {money(o.shipping)}</span>}
                  <div className="tiny muted">{o.payment_method}</div>
                </div>
                {o.status !== 'cancelado' && (o.paid ? <span className="pill ok">Pagado</span> : <span className="pill debe">Me debe</span>)}
              </div>
              {o.status !== 'cancelado' && (
                <div className="row start wrap" style={{ gap: 8 }}>
                  {o.status !== 'entregado' && (
                    <button className="btn small primary" onClick={() => advance(o)}>{o.status === 'nuevo' ? 'Despachar' : 'Marcar entregado'}</button>
                  )}
                  {!o.paid && <button className="btn small good" onClick={() => setPayFor(o)}>Ya me pagó</button>}
                  {c?.phone && !o.paid && (
                    <a className="btn small" href={waLink(c.phone, remind)} target="_blank" rel="noopener noreferrer"><IconWhats /> Cobrar</a>
                  )}
                  {c?.phone && o.status === 'encamino' && (
                    <a className="btn small" href={waLink(c.phone, ontheway)} target="_blank" rel="noopener noreferrer"><IconWhats /> Avisar</a>
                  )}
                  <button className="btn small ghost" onClick={() => setCancel(o)}>Cancelar</button>
                </div>
              )}
            </article>
          );
        })}</div>
      )}

      <Sheet open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `¿Cómo pagó el pedido #${payFor.number}?` : ''}>
        <div className="chips">
          {PAYMENTS.filter((p) => p !== 'Contraentrega').concat('Contraentrega').map((p) => (
            <button key={p} className="btn" onClick={() => markPaid(payFor, p)}>{p}</button>
          ))}
        </div>
      </Sheet>

      <Sheet open={!!cancel} onClose={() => setCancel(null)} title={cancel ? `¿Cancelar el pedido #${cancel.number}?` : ''}>
        <p className="muted" style={{ margin: 0 }}>Los productos vuelven al inventario y la venta deja de contar en tus cuentas. No se puede deshacer.</p>
        <button className="btn danger block" onClick={doCancel}>Sí, cancelar pedido</button>
        <button className="btn block" onClick={() => setCancel(null)}>No, dejarlo</button>
      </Sheet>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton" />}>
      <Pedidos />
    </Suspense>
  );
}
