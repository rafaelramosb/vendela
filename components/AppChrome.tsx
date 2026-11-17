'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBox, IconDots, IconHome, IconPlus, IconShirt } from './Icons';
import { useBiz } from './BizProvider';
import { daysLeft } from '@/lib/format';

const NAV = [
  { href: '/app', label: 'Inicio', icon: <IconHome /> },
  { href: '/app/pedidos', label: 'Pedidos', icon: <IconBox /> },
  { href: '/app/vender', label: 'Vender', icon: <IconPlus />, sell: true },
  { href: '/app/productos', label: 'Productos', icon: <IconShirt /> },
  { href: '/app/mas', label: 'Más', icon: <IconDots /> },
];
const UNDER_MAS = ['/app/gastos', '/app/clientas', '/app/cuentas', '/app/tienda', '/app/plan', '/app/ajustes'];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { biz, plan } = useBiz();
  const current = UNDER_MAS.some((p) => path.startsWith(p)) ? '/app/mas' : NAV.find((n) => n.href !== '/app' && path.startsWith(n.href))?.href || (path === '/app' ? '/app' : '');
  const chip =
    plan === 'pro' ? 'Plan Emprendedor' : plan === 'trial' ? `Prueba: ${daysLeft(biz.trial_ends_at)} días` : 'Plan Gratis';
  return (
    <>
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
          <Link key={n.href} href={n.href} className={n.sell ? 'sell' : ''} aria-current={current === n.href ? 'page' : undefined}>
            {n.sell ? <span className="fab">{n.icon}</span> : n.icon}
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
