'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { IconWhats } from '@/components/Icons';
import { dayLabel, errorText, money, waLink } from '@/lib/format';

export default function Clientas() {
  const { biz } = useBiz();
  const toast = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'total' | 'debe' | 'reciente'>('total');

  useEffect(() => {
    const sb = supabaseBrowser();
    Promise.all([
      sb.from('customers').select('id,name,phone,locality').eq('business_id', biz.id).limit(2000),
      sb.from('orders').select('customer_id,subtotal,shipping,paid,sold_on').eq('business_id', biz.id).neq('status', 'cancelado').not('customer_id', 'is', null).limit(10000),
    ]).then(([c, o]) => {
      if (c.error) return toast(errorText(c.error), 'error');
      const agg: Record<string, any> = {};
      (o.data || []).forEach((x: any) => {
        const a = (agg[x.customer_id] ||= { n: 0, total: 0, debe: 0, last: '' });
        a.n++;
        a.total += x.subtotal;
        if (!x.paid) a.debe += x.subtotal + x.shipping;
        if (x.sold_on > a.last) a.last = x.sold_on;
      });
      setRows((c.data || []).map((cu: any) => ({ ...cu, ...(agg[cu.id] || { n: 0, total: 0, debe: 0, last: '' }) })));
    });
  }, [biz.id, toast]);

  if (!rows) return <div className="skeleton" />;
  const list = rows
    .filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.phone || '').includes(q))
    .sort((a, b) => (sort === 'total' ? b.total - a.total : sort === 'debe' ? b.debe - a.debe : b.last.localeCompare(a.last)));
  const owed = rows.reduce((a, r) => a + r.debe, 0);

  return (
    <>
      <h2>Clientas</h2>
      <div className="tiles">
        <div className="tile"><span>Clientas</span><b className="num">{rows.length}</b></div>
        <div className="tile debt"><span>Me deben</span><b className="num">{money(owed)}</b></div>
      </div>
      <input className="search" type="search" placeholder="Buscar por nombre o celular" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar clienta" />
      <div className="tabs" role="group" aria-label="Ordenar">
        <button className="tab" aria-pressed={sort === 'total'} onClick={() => setSort('total')}>Más compran</button>
        <button className="tab" aria-pressed={sort === 'debe'} onClick={() => setSort('debe')}>Me deben</button>
        <button className="tab" aria-pressed={sort === 'reciente'} onClick={() => setSort('reciente')}>Recientes</button>
      </div>
      {list.length === 0 && <div className="card empty">Las clientas aparecen aquí cuando les registras una venta.</div>}
      <div className="cards">{list.map((r) => (
        <article className="card" key={r.id}>
          <div className="row">
            <div className="grow"><b>{r.name}</b><div className="muted tiny">{r.locality || 'Sin localidad'} · {r.n} {r.n === 1 ? 'compra' : 'compras'}{r.last ? ` · última ${dayLabel(r.last).toLowerCase()}` : ''}</div></div>
            <b className="num">{money(r.total)}</b>
          </div>
          <div className="row start wrap" style={{ gap: 8 }}>
            {r.debe > 0 && <span className="pill debe num">Me debe {money(r.debe)}</span>}
            {r.phone && (
              <a className="btn small" href={waLink(r.phone, r.debe > 0 ? `Hola ${r.name.split(' ')[0]}, te recuerdo el saldo pendiente de ${money(r.debe)} con ${biz.name}.${biz.payment_key ? ` Puedes pagar a: ${biz.payment_key}.` : ''} ¡Gracias!` : `Hola ${r.name.split(' ')[0]}, llegaron cosas nuevas a ${biz.name}. ¿Te muestro?`)} target="_blank" rel="noopener noreferrer"><IconWhats /> {r.debe > 0 ? 'Cobrar' : 'Escribir'}</a>
            )}
          </div>
        </article>
      ))}</div>
    </>
  );
}
