'use client';
import { useState } from 'react';
import { Sheet } from './Sheet';
import { useBiz } from './BizProvider';
import { useToast } from './Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { EXPENSE_CATEGORIES, errorText, money, toInt, todayCO } from '@/lib/format';

export function ExpenseSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const { biz } = useBiz();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = toInt(String(fd.get('amount')));
    if (!amount) return toast('Escribe el valor del gasto', 'error');
    const category = String(fd.get('category'));
    setBusy(true);
    const { error } = await supabaseBrowser().from('expenses').insert({
      business_id: biz.id,
      amount,
      category,
      concept: String(fd.get('concept') || '').trim() || category,
      kind: String(fd.get('kind')),
      spent_on: String(fd.get('spent_on') || todayCO()),
    });
    setBusy(false);
    if (error) return toast(errorText(error), 'error');
    toast(`Gasto de ${money(amount)} guardado`);
    onClose();
    onSaved?.();
  }
  return (
    <Sheet open={open} onClose={onClose} title="¿En qué gastaste?">
      <form onSubmit={onSubmit}>
        <label className="field"><span>Valor</span><input id="exp-amount" name="amount" inputMode="numeric" required placeholder="Ej: 45000" /></label>
        <div className="field">
          <span>Categoría</span>
          <div className="chips">
            {EXPENSE_CATEGORIES.map((c, i) => (
              <label className="chip" key={c}><input type="radio" name="category" value={c} defaultChecked={i === 4} /><span>{c}</span></label>
            ))}
          </div>
        </div>
        <label className="field"><span>Nota (opcional)</span><input id="exp-concept" name="concept" maxLength={80} placeholder="Ej: domicilio a Suba" /></label>
        <div className="field">
          <span>¿Se repite cada mes?</span>
          <div className="chips">
            <label className="chip"><input type="radio" name="kind" value="variable" defaultChecked /><span>No, fue una vez</span></label>
            <label className="chip"><input type="radio" name="kind" value="fijo" /><span>Sí, es fijo</span></label>
          </div>
        </div>
        <label className="field"><span>Fecha</span><input id="exp-date" name="spent_on" type="date" defaultValue={todayCO()} max={todayCO()} /></label>
        <button className="btn primary block" disabled={busy}>Guardar gasto</button>
      </form>
    </Sheet>
  );
}
