'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthShell } from '@/components/AuthShell';
import { errorText } from '@/lib/format';

export default function Bienvenida() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      const { data } = await sb.auth.getUser();
      const meta = data.user?.user_metadata || {};
      setName(meta.business_name || '');
      setPhone(meta.phone || '');
      if (data.user) {
        const { count } = await sb.from('business_members').select('business_id', { count: 'exact', head: true }).eq('user_id', data.user.id);
        if (count && count > 0) router.replace('/app');
      }
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const { error } = await supabaseBrowser().rpc('create_business', { p_name: name, p_phone: phone });
    setBusy(false);
    if (error && !/ya tiene un negocio/.test(error.message)) return setErr(errorText(error));
    router.replace('/app');
    router.refresh();
  }

  return (
    <AuthShell title="¡Bienvenida a Vendela!" sub="Confirma los datos de tu negocio y empieza tu prueba de 30 días.">
      <form onSubmit={onSubmit}>
        <label className="field"><span>Nombre de tu negocio</span><input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} /></label>
        <label className="field"><span>Tu WhatsApp</span><input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="300 123 4567" /></label>
        {err && <div className="error">{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creando…' : 'Entrar a mi negocio'}</button>
      </form>
    </AuthShell>
  );
}
