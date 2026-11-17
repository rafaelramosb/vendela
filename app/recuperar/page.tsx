'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthShell } from '@/components/AuthShell';
import { errorText } from '@/lib/format';

export default function Recuperar() {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/nueva-clave`,
    });
    setBusy(false);
    if (error) return setErr(errorText(error));
    setDone(true);
  }
  return (
    <AuthShell title="Recupera tu contraseña" foot={<Link href="/ingresar">Volver a ingresar</Link>}>
      {done ? (
        <div className="okbox">Si el correo tiene cuenta, te llegará un enlace para crear una contraseña nueva.</div>
      ) : (
        <form onSubmit={onSubmit}>
          <label className="field"><span>Correo</span><input id="email" name="email" type="email" required autoComplete="email" /></label>
          {err && <div className="error">{err}</div>}
          <button className="btn primary block" disabled={busy}>Enviar enlace</button>
        </form>
      )}
    </AuthShell>
  );
}
