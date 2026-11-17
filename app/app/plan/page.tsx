'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { PRICES, daysLeft, money, waLink } from '@/lib/format';

function Plan() {
  const { biz, plan } = useBiz();
  const toast = useToast();
  const params = useSearchParams();
  const [busy, setBusy] = useState(0);
  const support = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '';

  async function pay(months: number) {
    setBusy(months);
    try {
      const r = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ months }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo iniciar el pago');
      window.location.href = j.url;
    } catch (e: any) {
      toast(e.message, 'error');
      setBusy(0);
    }
  }

  return (
    <>
      <h2>Mi plan</h2>
      {params.get('pago') && <div className="okbox">Recibimos tu pago. En unos segundos se activa tu plan; si no lo ves, recarga la página.</div>}
      <section className="card">
        {plan === 'trial' && <><b>Te quedan {daysLeft(biz.trial_ends_at)} días de prueba con todo incluido.</b><span className="muted tiny">Cuando termine, pasas al plan Gratis y no pierdes nada de tu información.</span></>}
        {plan === 'pro' && <><b>Plan Emprendedor activo.</b><span className="muted tiny">Pagado hasta el {new Date(biz.paid_until!).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' })}.</span></>}
        {plan === 'free' && <><b>Estás en el plan Gratis.</b><span className="muted tiny">20 productos y 30 ventas al mes, sin tienda en línea. Tus datos siguen guardados.</span></>}
      </section>
      <div className="plan-card on">
        <div className="row"><b>Emprendedor</b><b className="num">{money(49900)} / mes</b></div>
        <span className="muted tiny">Productos y ventas ilimitados, tienda en línea, pedidos, clientas, gastos y cuentas del mes.</span>
        <div className="list">
          {PRICES.map((p) => (
            <div className="row" key={p.months}>
              <div><b>{p.label}</b><div className="muted tiny">{p.note}</div></div>
              <button className="btn small primary" disabled={!!busy} onClick={() => pay(p.months)}>{busy === p.months ? 'Abriendo…' : `Pagar ${money(p.total)}`}</button>
            </div>
          ))}
        </div>
        <small className="muted">Pagas con Nequi, PSE, Bancolombia o tarjeta a través de Wompi. Sin renovación automática.</small>
      </div>
      <div className="plan-card">
        <div className="row"><b>Gratis</b><b className="num">$ 0</b></div>
        <span className="muted tiny">20 productos y 30 ventas al mes, para siempre.</span>
      </div>
      {support && (
        <a className="btn block" href={waLink(support, `Hola, tengo una pregunta sobre mi plan de Vendela (${biz.name}).`)} target="_blank" rel="noopener noreferrer">Hablar con soporte por WhatsApp</a>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton" />}>
      <Plan />
    </Suspense>
  );
}
