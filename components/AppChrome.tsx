'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBox, IconChart, IconDots, IconGear, IconHome, IconPlus, IconShirt, IconStar, IconStore, IconUsers, IconWallet } from './Icons';
import { useBiz } from './BizProvider';
import { daysLeft } from '@/lib/format';

const NAV = [
  { href: '/app', label: 'Inicio', icon: <IconHome /> },
  { href: '/app/pedidos', label: 'Pedidos', icon: <IconBox /> },
  { href: '/app/vender', label: 'Vender', icon: <IconPlus />, sell: true },
  { href: '/app/productos', label: 'Productos', icon: <IconShirt /> },
  { href: '/app/mas', label: 'Más', icon: <IconDots /> },
];
const SIDE = [
  { href: '/app', label: 'Inicio', icon: <IconHome /> },
  { href: '/app/pedidos', label: 'Pedidos', icon: <IconBox /> },
  { href: '/app/productos', label: 'Productos', icon: <IconShirt /> },
  { href: '/app/clientas', label: 'Clientas', icon: <IconUsers /> },
  { href: '/app/gastos', label: 'Gastos', icon: <IconWallet /> },
  { href: '/app/cuentas', label: 'Cuentas del mes', icon: <IconChart /> },
  { href: '/app/tienda', label: 'Mi tienda en línea', icon: <IconStore /> },
  { href: '/app/plan', label: 'Mi plan', icon: <IconStar /> },
  { href: '/app/ajustes', label: 'Ajustes', icon: <IconGear /> },
];
const UNDER_MAS = ['/app/gastos', '/app/clientas', '/app/cuentas', '/app/tienda', '/app/plan', '/app/ajustes'];

function isActive(path: string, href: string) {
  return href === '/app' ? path === '/app' : path === href || path.startsWith(href + '/');
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { biz, plan } = useBiz();
  const bottomCurrent = UNDER_MAS.some((p) => path.startsWith(p)) ? '/app/mas' : NAV.find((n) => isActive(path, n.href))?.href;
  const chip = plan === 'pro' ? 'Plan Emprendedor' : plan === 'trial' ? `Prueba: ${daysLeft(biz.trial_ends_at)} días` : 'Plan Gratis';
  return (
    <div className="shell">
      <aside className="side" aria-label="Menú">
        <Link href="/app" className="side-brand">
          {biz.logo_url ? <img src={biz.logo_url} alt="" className="side-logo" /> : <span className="side-logo mono">{biz.name.slice(0, 1).toUpperCase()}</span>}
          <span className="grow">
            <b>{biz.name}</b>
            <small>Vendela</small>
          </span>
        </Link>
        <Link href="/app/vender" className="btn primary block side-sell"><IconPlus /> Vender</Link>
        <nav className="side-nav">
          {SIDE.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? 'page' : undefined}>
              {n.icon}
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/app/plan" className={`plan-chip ${plan}`}>{chip}</Link>
      </aside>
      <div className="app">
        <header className="top">
          <Link href="/app" className="brand">
            <b>{biz.name}</b>
            <small>Vendela</small>
          </Link>
          <Link href="/app/plan" className={`plan-chip ${plan}`}>{chip}</Link>
        </header>
        <main className="stack">{children}</main>
      </div>
      <nav className="bottom" aria-label="Navegación principal">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={n.sell ? 'sell' : ''} aria-current={bottomCurrent === n.href ? 'page' : undefined}>
            {n.sell ? <span className="fab">{n.icon}</span> : n.icon}
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
