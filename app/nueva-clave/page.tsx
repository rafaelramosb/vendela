'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthShell } from '@/components/AuthShell';
import { errorText } from '@/lib/format';

export default function NuevaClave() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get('password'));
    if (password.length < 8) return setErr('La contraseña debe tener al menos 8 caracteres.');
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) return setErr(errorText(error));
    router.replace('/app');
  }
  return (
    <AuthShell title="Crea tu contraseña nueva">
      <form onSubmit={onSubmit}>
        <label className="field"><span>Contraseña nueva</span><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
        {err && <div className="error">{err}</div>}
        <button className="btn primary block" disabled={busy}>Guardar</button>
      </form>
    </AuthShell>
  );
}
