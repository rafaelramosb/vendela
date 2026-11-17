'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { ExpenseSheet } from '@/components/ExpenseSheet';
import { addMonths, dayLabel, errorText, money, monthLabel, monthStart, todayCO } from '@/lib/format';

export default function Gastos() {
  const { biz } = useBiz();
  const toast = useToast();
  const [month, setMonth] = useState(monthStart());
  const [rows, setRows] = useState<any[] | null>(null);
  const [prevFixed, setPrevFixed] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const isCurrent = month === monthStart();

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const next = addMonths(month, 1);
    const prev = addMonths(month, -1);
    const [cur, pf] = await Promise.all([
      sb.from('expenses').select('*').eq('business_id', biz.id).gte('spent_on', month).lt('spent_on', next).order('spent_on', { ascending: false }),
      sb.from('expenses').select('concept,category,amount').eq('business_id', biz.id).eq('kind', 'fijo').gte('spent_on', prev).lt('spent_on', month),
    ]);
    if (cur.error) return toast(errorText(cur.error), 'error');
    setRows(cur.data || []);
    setPrevFixed(pf.data || []);
  }, [biz.id, month, toast]);
  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  async function remove(id: string) {
    const { error } = await supabaseBrowser().from('expenses').delete().eq('id', id);
    if (error) return toast(errorText(error), 'error');
    toast('Gasto borrado');
    load();
  }
  async function copyFixed() {
    const rowsIns = prevFixed.map((e) => ({ business_id: biz.id, concept: e.concept, category: e.category, amount: e.amount, kind: 'fijo', spent_on: isCurrent ? todayCO() : month }));
    const { error } = await supabaseBrowser().from('expenses').insert(rowsIns);
    if (error) return toast(errorText(error), 'error');
    toast(`${rowsIns.length} gastos fijos copiados`);
    load();
  }

  const total = (rows || []).reduce((a, e) => a + e.amount, 0);
  const fixed = (rows || []).filter((e) => e.kind === 'fijo').reduce((a, e) => a + e.amount, 0);
  const byCat = Object.entries((rows || []).reduce((m: any, e) => ((m[e.category] = (m[e.category] || 0) + e.amount), m), {})).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];
  const mx = byCat[0]?.[1] || 1;
  const hasFixedNow = (rows || []).some((e) => e.kind === 'fijo');

  return (
    <>
      <div className="row"><h2>Gastos</h2><button className="btn small primary" onClick={() => setOpen(true)}>Agregar</button></div>
      <div className="row">
        <button className="btn small" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mes anterior">‹</button>
        <b style={{ textTransform: 'capitalize' }}>{monthLabel(month)}</b>
        <button className="btn small" onClick={() => setMonth(addMonths(month, 1))} disabled={isCurrent} aria-label="Mes siguiente">›</button>
      </div>
      <div className="tiles">
        <div className="tile"><span>Total del mes</span><b className="num">{money(total)}</b></div>
        <div className="tile"><span>Fijos</span><b className="num">{money(fixed)}</b><small className="muted">se repiten cada mes</small></div>
      </div>
      {!hasFixedNow && prevFixed.length > 0 && (
        <div className="card">
          <b>¿Copiar tus gastos fijos del mes pasado?</b>
          <span className="muted tiny">{prevFixed.map((e) => `${e.concept} ${money(e.amount)}`).join(' · ')}</span>
          <button className="btn small primary" onClick={copyFixed}>Copiar {prevFixed.length} gastos fijos</button>
        </div>
      )}
      {byCat.length > 0 && (
        <section className="card">
          <h3>En qué se va la plata</h3>
          <div className="list">
            {byCat.map(([c, v]) => (
              <div className="hbar" key={c}><span>{c}</span><span className="track"><i style={{ width: `${Math.max(4, Math.round((v / mx) * 100))}%` }} /></span><b className="num">{money(v)}</b></div>
            ))}
          </div>
        </section>
      )}
      <section className="card">
        {!rows ? <div className="skeleton" /> : rows.length === 0 ? <div className="empty">Sin gastos este mes.</div> : (
          <div className="list">
            {rows.map((e) => (
              <div className="row" key={e.id}>
                <div className="grow"><b>{e.concept}</b><div className="muted tiny">{dayLabel(e.spent_on)} · {e.category} · {e.kind === 'fijo' ? 'Fijo' : 'Variable'}</div></div>
                <b className="num">{money(e.amount)}</b>
                <button className="icon-btn" aria-label={`Borrar ${e.concept}`} onClick={() => remove(e.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>
      <ExpenseSheet open={open} onClose={() => setOpen(false)} onSaved={load} />
    </>
  );
}
