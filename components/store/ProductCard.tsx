import Link from 'next/link';
import type { SProduct } from '@/lib/store';
import { colorOf } from '@/components/Thumb';
import { money } from '@/lib/format';
import { ProductImage } from './ProductImage';

export function ProductCard({ p, slug, i = 0 }: { p: SProduct; slug: string; i?: number }) {
  const colors = Array.from(new Set(p.variants.map((v) => v.color)));
  const sizes = Array.from(new Set(p.variants.map((v) => v.size))).filter((s) => s !== 'Única');
  const low = p.stock <= 2;
  return (
    <Link href={`/t/${slug}/p/${p.id}`} className="st-card" style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}>
      <div className={`st-card-img ${p.images.length > 1 ? 'has-alt' : ''}`}>
        <ProductImage src={p.images[0]} category={p.category} color={colors[0]} alt={p.name} priority={i < 4} />
        {p.images[1] && <img className="alt" src={p.images[1]} alt="" loading="lazy" decoding="async" />}
        <div className="st-badges">
          {p.is_new && <span className="st-badge st-new">Nuevo</span>}
          {low && <span className="st-badge">Últimas unidades</span>}
        </div>
      </div>
      <div className="st-card-body">
        <span className="st-card-name">{p.name}</span>
        <span className="st-price">{money(p.price)}</span>
        <span className="st-card-meta">
          {colors.filter((c) => c !== 'Único').slice(0, 5).map((c) => (
            <i key={c} className="st-dot" style={{ background: colorOf(c) }} title={c} />
          ))}
          {sizes.length > 0 && <span>{sizes.slice(0, 5).join(' · ')}</span>}
        </span>
      </div>
    </Link>
  );
}
