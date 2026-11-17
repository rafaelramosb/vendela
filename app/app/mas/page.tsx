'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useBiz } from '@/components/BizProvider';
import { IconChart, IconGear, IconOut, IconStar, IconStore, IconUsers, IconWallet, IconWhats } from '@/components/Icons';
import { waLink } from '@/lib/format';

export default function Mas() {
  const router = useRouter();
  const { email, biz } = useBiz();
  const support = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '';
  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace('/ingresar');
    router.refresh();
  }
  const items: [string, string, JSX.Element][] = [
    ['/app/tienda', 'Mi tienda en línea', <IconStore key="s" />],
    ['/app/clientas', 'Clientas', <IconUsers key="u" />],
    ['/app/gastos', 'Gastos', <IconWallet key="w" />],
    ['/app/cuentas', 'Cuentas del mes', <IconChart key="c" />],
    ['/app/plan', 'Mi plan', <IconStar key="p" />],
    ['/app/ajustes', 'Ajustes', <IconGear key="g" />],
  ];
  return (
    <>
      <h2>Más</h2>
      <div className="menu">
        {items.map(([href, label, icon]) => (
          <Link key={href} href={href} className="tile">{icon}<span>{label}</span></Link>
        ))}
      </div>
      {support && (
        <a className="btn block" href={waLink(support, `Hola, necesito ayuda con Vendela (${biz.name}).`)} target="_blank" rel="noopener noreferrer"><IconWhats /> Ayuda por WhatsApp</a>
      )}
      <button className="btn block ghost" onClick={logout}><IconOut /> Cerrar sesión</button>
      <p className="muted tiny center">{email} · Vendela by VBS</p>
    </>
  );
}
