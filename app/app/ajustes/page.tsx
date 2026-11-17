'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { errorText, onlyDigits } from '@/lib/format';

export default function Ajustes() {
  const { biz, refresh } = useBiz();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    let phone = onlyDigits(String(fd.get('phone')));
    if (phone.length === 12 && phone.startsWith('57')) phone = phone.slice(2);
    if (phone && (phone.length < 7 || phone.length > 15)) return toast('Escribe un celular válido', 'error');
    const slug = String(fd.get('slug')).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) return toast('El link solo puede tener letras minúsculas, números y guiones (3 a 40)', 'error');
    setBusy(true);
    const { error } = await supabaseBrowser()
      .from('businesses')
      .update({ name: String(fd.get('name')).trim(), phone: phone || null, city: String(fd.get('city')).trim() || 'Bogotá', slug })
      .eq('id', biz.id);
    setBusy(false);
    if (error) return toast(/duplicate|unique/i.test(error.message) ? 'Ese link ya lo usa otra tienda' : errorText(error), 'error');
    await refresh();
    toast('Datos guardados');
  }
  return (
    <>
      <h2>Ajustes del negocio</h2>
      <form className="card" onSubmit={save}>
        <label className="field"><span>Nombre del negocio</span><input id="aj-name" name="name" defaultValue={biz.name} required minLength={2} maxLength={80} /></label>
        <label className="field"><span>WhatsApp del negocio</span><input id="aj-phone" name="phone" inputMode="tel" defaultValue={biz.phone || ''} placeholder="300 123 4567" /></label>
        <label className="field"><span>Ciudad</span><input id="aj-city" name="city" defaultValue={biz.city} maxLength={40} /></label>
        <label className="field"><span>Link de tu tienda</span><input id="aj-slug" name="slug" defaultValue={biz.slug} maxLength={40} /><small>Quedará como /t/{biz.slug}. Si lo cambias, el link anterior deja de funcionar.</small></label>
        <button className="btn primary block" disabled={busy}>Guardar</button>
      </form>
    </>
  );
}
