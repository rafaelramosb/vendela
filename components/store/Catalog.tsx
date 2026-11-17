'use client';
import { useMemo, useState } from 'react';
import { CATEGORIES, money } from '@/lib/format';
import { useStore } from './StoreProvider';
import { ProductCard } from './ProductCard';
import { Monogram } from './StoreShell';
import { Chat, Insta, Search, Tiktok, Truck, Wallet } from './icons';

export function Catalog() {
  const { store } = useStore();
  const products = store.products || [];
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState<'new' | 'low' | 'high'>('new');
  const cats = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = products.filter((p) => (!cat || p.category === cat) && (!t || p.name.toLowerCase().includes(t) || (p.description || '').toLowerCase().includes(t)));
    if (sort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, q, cat, sort]);

  return (
    <>
      <section className={`st-hero ${store.cover ? 'with-cover' : ''}`}>
        {store.cover && <img className="st-hero-img" src={store.cover} alt="" />}
        {!store.cover && <span className="st-hero-letter" aria-hidden="true">{store.name.trim().slice(0, 1)}</span>}
        <div className="st-wrap st-hero-in">
          {!store.cover && <Monogram name={store.name} logo={store.logo} size={64} />}
          <h1>{store.name}</h1>
          <p>{store.tagline || `Ropa y accesorios con envío en ${store.city || 'Bogotá'}`}</p>
          <div className="st-hero-cta">
            <a href="#catalogo" className="st-btn st-primary">Ver catálogo</a>
            {store.instagram && <a className="st-pill" href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noopener noreferrer"><Insta /> @{store.instagram}</a>}
            {store.tiktok && <a className="st-pill" href={`https://www.tiktok.com/@${store.tiktok}`} target="_blank" rel="noopener noreferrer"><Tiktok /> @{store.tiktok}</a>}
          </div>
        </div>
      </section>

      <section className="st-wrap st-perks" aria-label="Cómo comprar">
        <div><Truck /><span><b>Envíos en {store.city || 'Bogotá'}</b>{store.shipping ? `Domicilio desde ${money(store.shipping)}` : 'Te cotizamos el domicilio'}</span></div>
        <div><Wallet /><span><b>Paga como quieras</b>Nequi, Bre-B o contraentrega</span></div>
        <div><Chat /><span><b>Te atendemos por WhatsApp</b>Confirmamos tu pedido en minutos</span></div>
      </section>

      <section id="catalogo" className="st-wrap st-catalog">
        <div className="st-catalog-head">
          <h2>Catálogo <small>{shown.length} {shown.length === 1 ? 'producto' : 'productos'}</small></h2>
          <div className="st-tools">
            <label className="st-search">
              <Search />
              <input type="search" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar productos" />
            </label>
            <select className="st-sort" value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Ordenar">
              <option value="new">Lo más nuevo</option>
              <option value="low">Menor precio</option>
              <option value="high">Mayor precio</option>
            </select>
          </div>
        </div>
        {cats.length > 1 && (
          <div className="st-chips" role="group" aria-label="Categorías">
            <button aria-pressed={!cat} onClick={() => setCat('')}>Todo</button>
            {cats.map((c) => (
              <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORIES[c] || c}</button>
            ))}
          </div>
        )}
        {products.length === 0 ? (
          <div className="st-empty-grid">Pronto subiremos productos nuevos. Escríbenos por WhatsApp para ver lo que tenemos.</div>
        ) : shown.length === 0 ? (
          <div className="st-empty-grid">No encontramos productos con esa búsqueda.</div>
        ) : (
          <div className="st-grid">
            {shown.map((p, i) => <ProductCard key={p.id} p={p} slug={store.slug} i={i} />)}
          </div>
        )}
      </section>
    </>
  );
}
