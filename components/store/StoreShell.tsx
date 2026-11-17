'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useStore } from './StoreProvider';
import { CartDrawer } from './CartDrawer';
import { Bag, Insta, Tiktok, Whats } from './icons';
import { waLink } from '@/lib/format';

export function Monogram({ name, logo, size = 40 }: { name: string; logo?: string | null; size?: number }) {
  if (logo) return <img src={logo} alt="" className="st-logo" style={{ width: size, height: size }} />;
  return (
    <span className="st-logo mono" style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden="true">
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

export function StoreShell({ children }: { children: React.ReactNode }) {
  const { store, count, open, setOpen } = useStore();
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (!count) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 450);
    return () => clearTimeout(t);
  }, [count]);

  const msgs = [`Envíos en ${store.city || 'Bogotá'}`, 'Paga con Nequi, Bre-B o contraentrega', 'Te confirmamos tu pedido por WhatsApp'];

  return (
    <>
      <div className="st-ticker" aria-label="Información de la tienda">
        <div className="st-ticker-track">
          {[...msgs, ...msgs].map((m, i) => (
            <span key={i} aria-hidden={i >= msgs.length}>{m}</span>
          ))}
        </div>
      </div>
      <header className="st-header">
        <div className="st-wrap st-header-in">
          <Link href={`/t/${store.slug}`} className="st-brand">
            <Monogram name={store.name} logo={store.logo} />
            <span>{store.name}</span>
          </Link>
          <nav className="st-header-actions">
            {store.instagram && (
              <a className="st-icon-btn hide-sm" href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Insta /></a>
            )}
            {store.tiktok && (
              <a className="st-icon-btn hide-sm" href={`https://www.tiktok.com/@${store.tiktok}`} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><Tiktok /></a>
            )}
            <button className={`st-bag ${bump ? 'bump' : ''}`} onClick={() => setOpen(true)} aria-label={`Ver bolsa, ${count} productos`}>
              <Bag />
              <span className="hide-sm">Bolsa</span>
              {count > 0 && <b className="st-count">{count}</b>}
            </button>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="st-footer">
        <div className="st-wrap st-footer-in">
          <div className="st-footer-brand">
            <Monogram name={store.name} logo={store.logo} size={48} />
            <h2>{store.name}</h2>
            {store.about && <p>{store.about}</p>}
          </div>
          <div className="st-footer-col">
            <h3>Compra fácil</h3>
            <p>Elige talla y color, haz tu pedido y te escribimos por WhatsApp para confirmar el pago y la entrega.</p>
          </div>
          <div className="st-footer-col">
            <h3>Síguenos</h3>
            <div className="st-social">
              {store.instagram && <a href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noopener noreferrer"><Insta /> @{store.instagram}</a>}
              {store.tiktok && <a href={`https://www.tiktok.com/@${store.tiktok}`} target="_blank" rel="noopener noreferrer"><Tiktok /> @{store.tiktok}</a>}
              {store.phone && <a href={waLink(store.phone, `Hola ${store.name}, tengo una pregunta.`)} target="_blank" rel="noopener noreferrer"><Whats /> WhatsApp</a>}
            </div>
          </div>
        </div>
        <div className="st-wrap st-footer-base">
          <span suppressHydrationWarning>© {new Date().getFullYear()} {store.name}</span>
          <Link href="/">Tienda hecha con <b>Vendela</b></Link>
        </div>
      </footer>

      {store.phone && !open && (
        <a className="st-wa-float" href={waLink(store.phone, `Hola ${store.name}, vi tu tienda en línea y tengo una pregunta.`)} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp">
          <Whats />
        </a>
      )}
      <CartDrawer />
    </>
  );
}
