'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { Thumb } from '@/components/Thumb';
import { ExpenseSheet } from '@/components/ExpenseSheet';
import { PurchaseSheet } from '@/components/PurchaseSheet';
import { MONTHS, money, todayCO, errorText } from '@/lib/format';

export default function Inicio() {
  const { biz, plan } = useBiz();
  const toast = useToast();
  const [s, setS] = useState<any>(null);
  const [sheet, setSheet] = useState<'' | 'gasto' | 'compra'>('');

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().rpc('month_summary', { p_business: biz.id });
    if (error) toast(errorText(error), 'error');
    else setS(data);
  }, [biz.id, toast]);
  useEffect(() => {
    load();
  }, [load]);

  const month = MONTHS[Number(todayCO().slice(5, 7)) - 1];
  if (!s) return <div className="skeleton" style={{ minHeight: 420 }} />;

  const gross = s.sales - s.cost;
  const net = gross - s.expenses;
  const pct = s.expenses ? Math.max(0, Math.min(100, Math.round((gross / s.expenses) * 100))) : 100;
  const missing = s.expenses - gross;
  const maxCh = s.by_channel[0]?.total || 1;
  const empty = s.orders === 0 && s.expense_count === 0;

  return (
    <>
      {plan === 'free' && (
        <Link href="/app/plan" className="notice" style={{ textDecoration: 'none' }}>
          Tu prueba terminó y estás en el plan Gratis (20 productos, 30 ventas al mes, sin tienda en línea). Toca aquí para activar el plan Emprendedor.
        </Link>
      )}
      {empty && (
        <div className="card">
          <h2>Empecemos</h2>
          <p className="muted" style={{ margin: 0 }}>Tres pasos y dejas el cuaderno:</p>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li><Link href="/app/productos?nuevo=1">Agrega tus productos</Link> con tallas, colores y cuántos tienes.</li>
            <li>Anota tus <button className="link" onClick={() => setSheet('gasto')}>gastos fijos</button>: arriendo, datos, empaques.</li>
            <li>Registra tu primera venta con el botón <b>Vender</b>.</li>
          </ol>
        </div>
      )}

      <section className="card hero" aria-label="Ganancia del mes">
        <h3>Gané en {month}</h3>
        <div className="big num">{money(net)}</div>
        <div className="sub num">
          Vendí {money(s.sales)} · la mercancía me costó {money(s.cost)} · gasté {money(s.expenses)}
        </div>
        <div className="bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <div className="sub">
          {s.expenses === 0
            ? 'Anota tus gastos para saber cuánto te queda de verdad.'
            : missing > 0
              ? <>Te faltan <b className="num">{money(missing)}</b> de ganancia para cubrir los gastos del mes.</>
              : 'Ya cubriste los gastos del mes. Desde aquí, todo es ganancia.'}
        </div>
      </section>

      <div className="tiles">
        <Link href="/app/pedidos" className="tile"><span>Vendí hoy</span><b className="num">{money(s.today_sales)}</b><small className="muted">{s.today_orders} {s.today_orders === 1 ? 'venta' : 'ventas'}</small></Link>
        <Link href="/app/pedidos?f=debe" className="tile debt"><span>Me deben</span><b className="num">{money(s.unpaid_total)}</b><small className="muted">{s.unpaid_orders} sin pagar</small></Link>
        <Link href="/app/pedidos" className="tile"><span>Por entregar</span><b className="num">{s.active_orders}</b><small className="muted">pedidos activos</small></Link>
        <Link href="/app/gastos" className="tile"><span>Gasté este mes</span><b className="num">{money(s.expenses)}</b><small className="muted">{s.expense_count} gastos</small></Link>
      </div>

      <div className="grid2">
        <button className="btn" onClick={() => setSheet('gasto')}>Gasté</button>
        <button className="btn" onClick={() => setSheet('compra')}>Compré mercancía</button>
      </div>

      <section className="card">
        <h2>¿Qué red me vende más?</h2>
        {s.by_channel.length ? (
          <div className="list">
            {s.by_channel.map((c: any) => (
              <div className="hbar" key={c.channel}>
                <span>{c.channel}</span>
                <span className="track"><i style={{ width: `${Math.max(4, Math.round((c.total / maxCh) * 100))}%` }} /></span>
                <b className="num">{money(c.total)}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">Aún no hay ventas este mes.</div>
        )}
        <small className="muted">Ventas de {month}, según la red que marcaste en cada venta.</small>
      </section>

      {s.top_products.length > 0 && (
        <section className="card">
          <h2>Lo que más se vende</h2>
          <div className="list">
            {s.top_products.map((p: any) => (
              <div className="row" key={p.name}><span>{p.name}</span><span className="muted num">{p.units} und · {money(p.total)}</span></div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="row"><h2>Se está acabando</h2><button className="btn small" onClick={() => setSheet('compra')}>Reponer</button></div>
        {s.low_stock.length ? (
          <div className="list">
            {s.low_stock.map((x: any) => (
              <div className="row" key={x.variant_id}>
                <div className="row start grow">
                  <Thumb category={x.category} color={x.color} />
                  <div className="grow"><b>{x.name}</b><div className="muted tiny">{x.size} · {x.color}</div></div>
                </div>
                <span className={`pill ${x.stock === 0 ? 'debe' : 'encamino'}`}>{x.stock === 0 ? 'Agotado' : 'Queda 1'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">Todo tiene stock.</div>
        )}
      </section>

      <ExpenseSheet open={sheet === 'gasto'} onClose={() => setSheet('')} onSaved={load} />
      <PurchaseSheet open={sheet === 'compra'} onClose={() => setSheet('')} onSaved={load} />
      <p className="tiny muted center">Tu tienda: <Link href={`/t/${biz.slug}`}>/t/{biz.slug}</Link></p>
    </>
  );
}
