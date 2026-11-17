'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { SProduct } from '@/lib/store';
import { colorOf } from '@/components/Thumb';
import { money, waLink } from '@/lib/format';
import { useStore } from './StoreProvider';
import { ProductImage } from './ProductImage';
import { ProductCard } from './ProductCard';
import { Back, Bag, Chat, Truck, Wallet, Whats } from './icons';

export function ProductView({ product }: { product: SProduct }) {
  const { store, add, setOpen } = useStore();
  const p = product;
  const colors = useMemo(() => Array.from(new Set(p.variants.map((v) => v.color))), [p]);
  const [color, setColor] = useState(colors[0]);
  const sizesAll = useMemo(() => Array.from(new Set(p.variants.map((v) => v.size))), [p]);
  const sizesFor = p.variants.filter((v) => v.color === color);
  const [size, setSize] = useState<string>(sizesFor.length === 1 ? sizesFor[0].size : '');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);

  const variant = p.variants.find((v) => v.color === color && v.size === size);
  const showColor = !(colors.length === 1 && colors[0] === 'Único');
  const showSize = !(sizesAll.length === 1 && sizesAll[0] === 'Única');
  const images = p.images.length ? p.images : [''];
  const related = (store.products || []).filter((x) => x.id !== p.id).sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category)).slice(0, 4);

  function pickColor(c: string) {
    setColor(c);
    const avail = p.variants.filter((v) => v.color === c);
    if (!avail.some((v) => v.size === size)) setSize(avail.length === 1 ? avail[0].size : '');
    setQty(1);
    setMsg('');
  }
  function goTo(i: number) {
    setActive(i);
    const el = rail.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' });
  }
  function addToBag() {
    if (!variant) return setMsg(showSize ? 'Elige tu talla' : 'Elige una opción');
    if (!add(p, variant, qty)) return setMsg('Ya tienes en la bolsa todas las unidades disponibles');
    setMsg('');
    setOpen(true);
  }

  return (
    <div className="st-wrap st-pdp">
      <Link href={`/t/${store.slug}#catalogo`} className="st-back"><Back /> Catálogo</Link>
      <div className="st-pdp-grid">
        <div className="st-gallery">
          <div className="st-rail" ref={rail} onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
            {images.map((src, i) => (
              <div className="st-slide" key={i}>
                <ProductImage src={src || null} category={p.category} color={color} alt={`${p.name}${images.length > 1 ? `, foto ${i + 1}` : ''}`} priority={i === 0} />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <div className="st-thumbs">
              {images.map((src, i) => (
                <button key={i} aria-label={`Ver foto ${i + 1}`} aria-pressed={active === i} onClick={() => goTo(i)}>
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="st-info">
          <div className="st-badges static">
            {p.is_new && <span className="st-badge st-new">Nuevo</span>}
            {p.stock <= 2 && <span className="st-badge">Últimas unidades</span>}
          </div>
          <h1>{p.name}</h1>
          <p className="st-pdp-price">{money(p.price)}</p>
          {p.description && <p className="st-desc">{p.description}</p>}

          {showColor && (
            <div className="st-opt">
              <span className="st-opt-label">Color: <b>{color}</b></span>
              <div className="st-colors">
                {colors.map((c) => (
                  <button key={c} aria-pressed={c === color} aria-label={c} title={c} onClick={() => pickColor(c)}>
                    <i style={{ background: colorOf(c) }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {showSize && (
            <div className="st-opt">
              <span className="st-opt-label">Talla{size ? <>: <b>{size}</b></> : ''}</span>
              <div className="st-sizes">
                {sizesAll.map((s) => {
                  const v = p.variants.find((x) => x.color === color && x.size === s);
                  return (
                    <button key={s} aria-pressed={size === s} disabled={!v} onClick={() => { setSize(s); setQty(1); setMsg(''); }}>{s}</button>
                  );
                })}
              </div>
            </div>
          )}
          {variant && variant.stock <= 2 && <p className="st-hint">{variant.stock === 1 ? 'Queda 1 unidad' : 'Quedan 2 unidades'}</p>}

          <div className="st-buy">
            <div className="st-stepper st-lg">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Menos">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(variant?.stock || 5, qty + 1))} disabled={!!variant && qty >= variant.stock} aria-label="Más">+</button>
            </div>
            <button className="st-btn st-primary grow" onClick={addToBag}><Bag /> Agregar a la bolsa</button>
          </div>
          {msg && <p className="st-err" role="alert">{msg}</p>}
          {store.phone && (
            <a className="st-btn ghost block" href={waLink(store.phone, `Hola ${store.name}, me interesa: ${p.name}${color && color !== 'Único' ? ` color ${color}` : ''}${size && size !== 'Única' ? ` talla ${size}` : ''}. ¿Está disponible?`)} target="_blank" rel="noopener noreferrer">
              <Whats /> Preguntar por WhatsApp
            </a>
          )}

          <ul className="st-assure">
            <li><Truck /><span><b>Envío a domicilio</b> en {store.city || 'Bogotá'}{store.shipping ? ` por ${money(store.shipping)}` : ''}.</span></li>
            <li><Wallet /><span><b>Pago</b> por Nequi, Bre-B o contraentrega, según confirme la tienda.</span></li>
            <li><Chat /><span><b>Confirmación por WhatsApp</b> antes de despachar.</span></li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="st-related">
          <h2>También te puede gustar</h2>
          <div className="st-grid">{related.map((r, i) => <ProductCard key={r.id} p={r} slug={store.slug} i={i} />)}</div>
        </section>
      )}
    </div>
  );
}
