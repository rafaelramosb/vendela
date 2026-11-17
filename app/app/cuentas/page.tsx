'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { addMonths, errorText, money, monthLabel, monthStart } from '@/lib/format';

export default function Cuentas() {
  const { biz } = useBiz();
  const toast = useToast();
  const [month, setMonth] = useState(monthStart());
  const [s, setS] = useState<any>(null);
  const isCurrent = month === monthStart();

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().rpc('month_summary', { p_business: biz.id, p_day: month });
    if (error) return toast(errorText(error), 'error');
    setS(data);
  }, [biz.id, month, toast]);
  useEffect(() => {
    setS(null);
    load();
  }, [load]);

  async function copyCsv() {
    const { data, error } = await supabaseBrowser()
      .from('orders')
      .select('number,sold_on,channel,payment_method,paid,status,subtotal,cost_total,shipping,customers(name),order_items(name,size,color,qty,price)')
      .eq('business_id', biz.id)
      .gte('sold_on', month)
      .lt('sold_on', addMonths(month, 1))
      .order('number');
    if (error) return toast(errorText(error), 'error');
    const head = ['Pedido', 'Fecha', 'Clienta', 'Productos', 'Red', 'Pago', 'Pagado', 'Estado', 'Venta', 'Costo', 'Envío'];
    const lines = (data || []).map((o: any) =>
      [o.number, o.sold_on, o.customers?.name || '', o.order_items.map((i: any) => `${i.qty} ${i.name} ${i.size} ${i.color}`).join(' / '), o.channel, o.payment_method, o.paid ? 'Sí' : 'No', o.status, o.subtotal, o.cost_total, o.shipping].join('\t')
    );
    try {
      await navigator.clipboard.writeText([head.join('\t'), ...lines].join('\n'));
      toast('Copiado. Pégalo en Excel o Google Sheets.');
    } catch {
      toast('Tu navegador no dejó copiar', 'error');
    }
  }

  return (
    <>
      <h2>Cuentas del mes</h2>
      <div className="row">
        <button className="btn small" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mes anterior">‹</button>
        <b style={{ textTransform: 'capitalize' }}>{monthLabel(month)}</b>
        <button className="btn small" onClick={() => setMonth(addMonths(month, 1))} disabled={isCurrent} aria-label="Mes siguiente">›</button>
      </div>
      {!s ? <div className="skeleton" /> : (
        <>
          <section className="card">
            <h3>¿Cuánto gané?</h3>
            <table className="pl num"><tbody>
              <tr><td>Vendí ({s.orders} ventas)</td><td>{money(s.sales)}</td></tr>
              <tr className="neg"><td>Lo que me costó la mercancía</td><td>− {money(s.cost)}</td></tr>
              <tr className="sum"><td>Ganancia en ventas</td><td>{money(s.sales - s.cost)}</td></tr>
              <tr className="neg"><td>Gastos del mes</td><td>− {money(s.expenses)}</td></tr>
              <tr className="sum"><td>Me quedó</td><td>{money(s.sales - s.cost - s.expenses)}</td></tr>
            </tbody></table>
            {s.sales > 0 && <small className="muted">Margen sobre ventas: {Math.round(((s.sales - s.cost) / s.sales) * 100)}%.</small>}
          </section>
          <section className="card">
            <h3>Plata que entró y salió</h3>
            <table className="pl num"><tbody>
              <tr><td>Me pagaron (ventas del mes)</td><td>{money(s.collected)}</td></tr>
              <tr><td>Me deben de este mes</td><td>{money(s.sales - s.collected)}</td></tr>
              <tr className="neg"><td>Pagué en gastos</td><td>− {money(s.expenses)}</td></tr>
              <tr className="neg"><td>Pagué en mercancía</td><td>− {money(s.purchases)}</td></tr>
            </tbody></table>
          </section>
          {s.by_payment.length > 0 && (
            <section className="card">
              <h3>Cómo me pagaron</h3>
              <div className="list">{s.by_payment.map((x: any) => <div className="row" key={x.payment_method}><span>{x.payment_method}</span><b className="num">{money(x.total)}</b></div>)}</div>
            </section>
          )}
          {s.by_channel.length > 0 && (
            <section className="card">
              <h3>Ventas por red</h3>
              <div className="list">{s.by_channel.map((x: any) => <div className="row" key={x.channel}><span>{x.channel} · {x.n} ventas</span><b className="num">{money(x.total)}</b></div>)}</div>
            </section>
          )}
          <button className="btn block" onClick={copyCsv}>Copiar ventas del mes para Excel</button>
          <p className="muted tiny">Este resumen no es una declaración de impuestos ni una factura. Tu contador lo puede usar como base.</p>
        </>
      )}
    </>
  );
}
