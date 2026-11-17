'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthShell } from '@/components/AuthShell';
import { errorText } from '@/lib/format';

export default function Registro() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email')).trim();
    const password = String(fd.get('password'));
    const business = String(fd.get('business')).trim();
    const phone = String(fd.get('phone')).trim();
    if (password.length < 8) return setErr('La contraseña debe tener al menos 8 caracteres.');
    if (!fd.get('terms')) return setErr('Acepta los términos y la política de datos para continuar.');
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/bienvenida`,
        data: { business_name: business, phone },
      },
    });
    if (error) {
      setBusy(false);
      return setErr(errorText(error));
    }
    if (data.session) {
      const { error: e2 } = await supabase.rpc('create_business', { p_name: business, p_phone: phone });
      setBusy(false);
      if (e2) return router.replace('/bienvenida');
      router.replace('/app');
      router.refresh();
      return;
    }
    setBusy(false);
    setSentTo(email);
  }

  if (sentTo)
    return (
      <AuthShell title="Revisa tu correo" sub={`Te enviamos un enlace a ${sentTo} para confirmar tu cuenta.`}>
        <p className="muted" style={{ margin: 0 }}>Ábrelo desde este mismo celular. Si no llega en unos minutos, revisa la carpeta de spam.</p>
        <Link href="/ingresar" className="btn block">Ir a ingresar</Link>
      </AuthShell>
    );

  return (
    <AuthShell
      title="Crea tu cuenta gratis"
      sub="30 días con todo incluido. Sin tarjeta."
      foot={<>¿Ya tienes cuenta? <Link href="/ingresar">Ingresa</Link></>}
    >
      <form onSubmit={onSubmit}>
        <label className="field"><span>Nombre de tu negocio</span><input id="business" name="business" required minLength={2} maxLength={80} placeholder="Ej: Moda Valen" /></label>
        <label className="field"><span>Tu WhatsApp</span><input id="phone" name="phone" inputMode="tel" required placeholder="300 123 4567" /><small>Ahí te llegan los pedidos de tu tienda en línea.</small></label>
        <label className="field"><span>Correo</span><input id="email" name="email" type="email" autoComplete="email" required /></label>
        <label className="field"><span>Contraseña</span><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /><small>Mínimo 8 caracteres.</small></label>
        <label className="switch tiny" style={{ fontWeight: 500 }}>
          <span>Acepto los <Link href="/terminos">términos y la política de datos</Link></span>
          <input id="terms" name="terms" type="checkbox" />
        </label>
        {err && <div className="error">{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Creando tu cuenta…' : 'Empezar gratis'}</button>
      </form>
    </AuthShell>
  );
}
