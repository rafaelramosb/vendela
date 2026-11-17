'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthShell } from '@/components/AuthShell';
import { errorText } from '@/lib/format';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(fd.get('email')).trim(),
      password: String(fd.get('password')),
    });
    setBusy(false);
    if (error) return setErr(errorText(error));
    router.replace(safeNext);
    router.refresh();
  }

  return (
    <AuthShell
      title="Ingresa a tu negocio"
      foot={<>¿No tienes cuenta? <Link href="/registro">Pruébala 30 días gratis</Link></>}
    >
      {params.get('confirmado') && <div className="okbox">Tu correo quedó confirmado. Ya puedes ingresar.</div>}
      <form onSubmit={onSubmit}>
        <label className="field"><span>Correo</span><input id="email" name="email" type="email" autoComplete="email" required /></label>
        <label className="field"><span>Contraseña</span><input id="password" name="password" type="password" autoComplete="current-password" required /></label>
        {err && <div className="error">{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <Link href="/recuperar" className="tiny center">Olvidé mi contraseña</Link>
      </form>
    </AuthShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
